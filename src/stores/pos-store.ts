import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartLineItem, HeldSaleItem, ProductItem, ReceiptPayload } from '@/lib/types';
import { isOpticalProduct, formatOpticalSpecs } from '@/lib/utils';

interface PosState {
  // Cart items
  lines: CartLineItem[];
  selectedLineId: string | null;

  // Customer
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerId: string | null;
  customerStoreCredit: number;

  // Pricing & Totals
  discountAmount: number;
  discountType: 'FIXED' | 'PERCENT';
  deliveryFee: number;
  taxRate: number;

  // Held Parked Sales
  heldSales: HeldSaleItem[];

  // Active Modals
  isPaymentModalOpen: boolean;
  isLensConfigModalOpen: boolean;
  selectedProductForConfig: ProductItem | null;
  isCustomerModalOpen: boolean;
  isHeldSalesModalOpen: boolean;
  isExpenseModalOpen: boolean;
  isTillActionModalOpen: boolean;
  isShiftModalOpen: boolean;
  isReceiptModalOpen: boolean;
  completedReceipt: ReceiptPayload | null;

  // Toast / notification
  toast: { title: string; message: string; isSuccess: boolean; visible: boolean } | null;

  // Actions
  addLine: (product: ProductItem, config?: Partial<CartLineItem>) => void;
  addAnotherEyeLine: (lineId?: string | null) => void;
  setLineEye: (lineId: string, eye: 'OD' | 'OS' | '') => void;
  updateLineQuantity: (lineId: string, quantity: number) => void;
  incrementLineQuantity: (lineId: string, delta: number) => void;
  updateLineSpecs: (lineId: string, specs: Partial<CartLineItem>) => void;
  removeLine: (lineId: string) => void;
  setSelectedLineId: (lineId: string | null) => void;
  clearCart: () => void;

  setCustomer: (customer: { id?: string | null; name: string; phone: string; email?: string; storeCreditQar?: number }) => void;
  setDiscount: (amount: number, type?: 'FIXED' | 'PERCENT') => void;
  setDeliveryFee: (fee: number) => void;

  holdCurrentSale: () => boolean;
  recallSale: (id: string) => void;
  removeHeldSale: (id: string) => void;

  // Modal toggles
  setPaymentModalOpen: (open: boolean) => void;
  setLensConfigModalOpen: (open: boolean, product?: ProductItem | null) => void;
  setCustomerModalOpen: (open: boolean) => void;
  setHeldSalesModalOpen: (open: boolean) => void;
  setExpenseModalOpen: (open: boolean) => void;
  setTillActionModalOpen: (open: boolean) => void;
  setShiftModalOpen: (open: boolean) => void;
  setReceiptModalOpen: (open: boolean, receipt?: ReceiptPayload | null) => void;

  showToast: (title: string, message: string, isSuccess?: boolean) => void;
  hideToast: () => void;

  // Computed Totals getters
  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getTaxTotal: () => number;
  getGrandTotal: () => number;
  getItemCount: () => number;
}

// Helper to compare if two lines are identical in product, eye, and optical specifications
function areSpecsIdentical(a: CartLineItem, b: CartLineItem): boolean {
  if (a.productId !== b.productId) return false;
  if ((a.eye || '') !== (b.eye || '')) return false;
  const pA = a.isPlano ? '0.00' : (a.power ? a.power.trim() : '0.00');
  const pB = b.isPlano ? '0.00' : (b.power ? b.power.trim() : '0.00');
  if (pA !== pB) return false;
  if ((a.cylinder || '') !== (b.cylinder || '')) return false;
  if ((a.axis ?? null) !== (b.axis ?? null)) return false;
  if ((a.addPower || '') !== (b.addPower || '')) return false;
  return true;
}

// Calculate total available stock for a specific optical line based on its batches
export function getAvailableStockForLine(
  line: CartLineItem,
  batches?: { power?: string | null; cylinder?: string | null; axis?: number | null; quantity: number }[]
): number {
  const lineBatches = batches && batches.length > 0 ? batches : line.batches;
  if (!lineBatches || lineBatches.length === 0) {
    return line.stockQuantity ?? 999;
  }

  const targetPower = line.isPlano ? '0.00' : (line.power ? line.power.trim() : '0.00');
  const targetCyl = line.cylinder ? line.cylinder.trim() : null;
  const targetAxis = line.axis ?? null;

  const matchingBatches = lineBatches.filter((b) => {
    const bP = b.power ? b.power.trim() : '0.00';
    const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
    const normTarget = targetPower === '0.00' || targetPower.toLowerCase().includes('plano') ? '0.00' : targetPower;
    if (normBP !== normTarget) return false;

    if (targetCyl) {
      if ((b.cylinder ? b.cylinder.trim() : '') !== targetCyl) return false;
    }
    if (targetAxis !== null) {
      if (b.axis !== targetAxis) return false;
    }
    return true;
  });

  if (matchingBatches.length > 0) {
    return matchingBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  }

  // Fallback to power-only batches
  const powerOnlyBatches = lineBatches.filter((b) => {
    const bP = b.power ? b.power.trim() : '0.00';
    const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
    const normTarget = targetPower === '0.00' || targetPower.toLowerCase().includes('plano') ? '0.00' : targetPower;
    return normBP === normTarget;
  });
  if (powerOnlyBatches.length > 0) {
    return powerOnlyBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  }

  return line.stockQuantity ?? 0;
}

// Calculate how many units of this product + power are already reserved in OTHER cart lines
export function getOtherLinesStockUsage(
  targetLine: CartLineItem,
  allLines: CartLineItem[]
): number {
  const normTarget = targetLine.isPlano ? '0.00' : (targetLine.power ? targetLine.power.trim() : '0.00');
  return allLines
    .filter((l) => {
      if (l.lineId === targetLine.lineId) return false;
      if (l.productId !== targetLine.productId) return false;
      const lPower = l.isPlano ? '0.00' : (l.power ? l.power.trim() : '0.00');
      if (normTarget !== lPower) return false;
      if (targetLine.cylinder && l.cylinder !== targetLine.cylinder) return false;
      if (targetLine.axis !== null && targetLine.axis !== undefined && l.axis !== targetLine.axis) return false;
      return true;
    })
    .reduce((sum, l) => sum + l.quantity, 0);
}

// Merge duplicate cart lines with identical product, eye, and optical specifications
function consolidateLines(
  lines: CartLineItem[],
  activeLineId?: string | null
): { lines: CartLineItem[]; selectedLineId: string | null; didMerge: boolean } {
  const result: CartLineItem[] = [];
  let finalSelectedId = activeLineId || (lines.length > 0 ? lines[0].lineId : null);
  let didMerge = false;

  for (const line of lines) {
    const existing = result.find((r) => areSpecsIdentical(r, line));
    if (existing) {
      existing.quantity += line.quantity;
      const maxStock = getAvailableStockForLine(existing);
      if (existing.quantity > maxStock) {
        existing.quantity = maxStock;
      }
      if (line.lineId === activeLineId) {
        finalSelectedId = existing.lineId;
      }
      didMerge = true;
    } else {
      result.push({ ...line });
    }
  }

  return { lines: result, selectedLineId: finalSelectedId, didMerge };
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      lines: [],
      selectedLineId: null,

      customerName: 'Walk-in Customer',
      customerPhone: '',
      customerEmail: '',
      customerId: null,
      customerStoreCredit: 0,

      discountAmount: 0,
      discountType: 'FIXED',
      deliveryFee: 0,
      taxRate: 0,

      heldSales: [],

      isPaymentModalOpen: false,
      isLensConfigModalOpen: false,
      selectedProductForConfig: null,
      isCustomerModalOpen: false,
      isHeldSalesModalOpen: false,
      isExpenseModalOpen: false,
      isTillActionModalOpen: false,
      isShiftModalOpen: false,
      isReceiptModalOpen: false,
      completedReceipt: null,

      toast: null,

      addLine: (product, config) => {
        const { lines } = get();
        const price = product.salePriceQar ?? product.basePriceQar;
        const isOptical = isOpticalProduct(product);
        const inStockBatches = (product.batches || []).filter((b) => (b.quantity ?? 0) > 0);

        const targetEye = config?.eye ?? (isOptical ? 'OD' : '');

        // 1. Resolve target optical specs FIRST
        let targetPower: string | null = config?.power !== undefined ? config.power : null;
        let targetCyl: string | null = config?.cylinder !== undefined ? config.cylinder : null;
        let targetAxis: number | null = config?.axis !== undefined ? config.axis : null;
        let targetAdd: string | null = config?.addPower !== undefined ? config.addPower : null;
        let isPlano = Boolean(config?.isPlano);

        if (targetPower === null && isOptical) {
          // Find the first batch with remaining stock not yet exhausted by lines already in cart
          const availableBatch = inStockBatches.find((b) => {
            const bP = b.power ? b.power.trim() : '0.00';
            const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
            const alreadyUsed = lines
              .filter(
                (l) =>
                  l.productId === product.id &&
                  (l.isPlano ? '0.00' : (l.power ? l.power.trim() : '0.00')) === normBP
              )
              .reduce((sum, l) => sum + l.quantity, 0);
            return (b.quantity || 0) > alreadyUsed;
          });

          if (availableBatch) {
            targetPower = availableBatch.power || '0.00';
            targetCyl = targetCyl ?? availableBatch.cylinder ?? null;
            targetAxis = targetAxis ?? availableBatch.axis ?? null;
            targetAdd = targetAdd ?? availableBatch.addPower ?? null;
            isPlano = targetPower === '0.00' || targetPower.toLowerCase().includes('plano');
          } else if (inStockBatches.length > 0) {
            // All specific batches are already in cart at max stock
            get().showToast(
              'Stock Limit',
              `All available in-stock powers for ${product.titleEn} are already added to your cart.`,
              false
            );
            return;
          } else if (product.power) {
            targetPower = String(product.power);
            isPlano = targetPower === '0.00' || targetPower.toLowerCase().includes('plano');
          } else if (product.availablePowers && product.availablePowers.length > 0) {
            targetPower = product.availablePowers[0];
            isPlano = targetPower === '0.00' || targetPower.toLowerCase().includes('plano');
          } else if (product.hasPlanoOption) {
            targetPower = '0.00';
            isPlano = true;
          } else {
            targetPower = '0.00';
            isPlano = true;
          }
        }

        const normTargetPower = isPlano ? '0.00' : (targetPower ? targetPower.trim() : '0.00');

        // 2. Check if an exact matching line exists (matching product, eye, and optical power)
        const existingIndex = lines.findIndex((l) => {
          if (l.productId !== product.id) return false;
          if (targetEye && l.eye !== targetEye) return false;
          if (isOptical) {
            const normLinePower = l.isPlano ? '0.00' : (l.power ? l.power.trim() : '0.00');
            if (normLinePower !== normTargetPower) return false;
            if (targetCyl && (l.cylinder || '') !== targetCyl) return false;
            if (targetAxis !== null && (l.axis || null) !== targetAxis) return false;
          }
          return true;
        });

        if (existingIndex >= 0) {
          const line = lines[existingIndex];
          const totalStock = getAvailableStockForLine(line);
          const usedByOthers = getOtherLinesStockUsage(line, lines);
          const maxAllowed = Math.max(0, totalStock - usedByOthers);
          const wantedQty = line.quantity + (config?.quantity || 1);

          if (wantedQty > maxAllowed) {
            get().showToast(
              'Stock Limit',
              `Cannot add more. Only ${maxAllowed} in stock for ${line.titleEn} (${line.power || 'Plano'}).`,
              false
            );
            return;
          }

          const updated = [...lines];
          updated[existingIndex].quantity = wantedQty;
          set({ lines: updated, selectedLineId: updated[existingIndex].lineId });
        } else {
          const lensSummary = formatOpticalSpecs({
            eye: targetEye,
            power: targetPower,
            cylinder: targetCyl,
            axis: targetAxis,
            addPower: targetAdd,
            isPlano,
            productType: product.productType,
          }) || (isOptical ? 'Standard' : '');

          const newLine: CartLineItem = {
            lineId: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            productId: product.id,
            sku: product.sku,
            barcode: product.barcode,
            titleEn: product.titleEn,
            titleAr: product.titleAr,
            brandName: product.brandName,
            unitPrice: price,
            lensPrice: 0,
            quantity: config?.quantity || 1,
            eye: targetEye,
            power: targetPower,
            cylinder: targetCyl,
            axis: targetAxis,
            addPower: targetAdd,
            isPlano,
            lensSummary,
            imageUrl: product.imageUrl,
            stockQuantity: product.stockQuantity,
            productType: product.productType,
            availablePowers: product.availablePowers || [],
            hasPlanoOption: product.hasPlanoOption,
            batches: inStockBatches,
          };

          // Check if this new line has available stock
          const availableStock = getAvailableStockForLine(newLine);
          const usedInCart = getOtherLinesStockUsage(newLine, lines);
          const maxAvailable = Math.max(0, availableStock - usedInCart);

          if (maxAvailable <= 0) {
            get().showToast(
              'Out of Stock',
              `All in-stock units of ${newLine.titleEn} (${newLine.power || 'Plano'}) are already in the cart.`,
              false
            );
            return;
          }

          const { lines: consolidated, selectedLineId } = consolidateLines([...lines, newLine], newLine.lineId);
          set({
            lines: consolidated,
            selectedLineId: selectedLineId || newLine.lineId,
          });
        }
      },

      addAnotherEyeLine: (lineId) => {
        const { lines, selectedLineId } = get();
        const targetId = lineId || selectedLineId;
        const targetLine = lines.find((l) => l.lineId === targetId);
        if (!targetLine) return;

        let newEye: 'OD' | 'OS' = 'OS';
        let updatedTargetEye: 'OD' | 'OS' = (targetLine.eye as 'OD' | 'OS') || 'OD';

        if (targetLine.eye === 'OD') {
          newEye = 'OS';
        } else if (targetLine.eye === 'OS') {
          newEye = 'OD';
        } else {
          updatedTargetEye = 'OD';
          newEye = 'OS';
        }

        // Check stock availability for targetLine's power
        const totalBatchStock = getAvailableStockForLine(targetLine);
        const usedInCart = lines
          .filter(
            (l) =>
              l.productId === targetLine.productId &&
              (l.isPlano ? '0.00' : l.power) === (targetLine.isPlano ? '0.00' : targetLine.power)
          )
          .reduce((sum, l) => sum + l.quantity, 0);

        let chosenPower = targetLine.power;
        let chosenPlano = targetLine.isPlano;

        // If all stock of targetLine's power is already in cart, auto-select next available in-stock power
        if (usedInCart >= totalBatchStock) {
          const altBatch = (targetLine.batches || []).find((b) => {
            const bP = b.power ? b.power.trim() : '0.00';
            const bUsed = lines
              .filter(
                (l) =>
                  l.productId === targetLine.productId &&
                  (l.isPlano ? '0.00' : l.power) === bP
              )
              .reduce((sum, l) => sum + l.quantity, 0);
            return (b.quantity || 0) > bUsed;
          });

          if (altBatch && altBatch.power) {
            chosenPower = altBatch.power;
            chosenPlano = chosenPower === '0.00' || chosenPower.toLowerCase().includes('plano');
            get().showToast(
              'Stock Notice',
              `Only ${totalBatchStock} in stock for ${targetLine.titleEn} (${targetLine.power || 'Plano'}). Defaulted other eye to ${chosenPower}.`,
              false
            );
          } else {
            get().showToast(
              'Stock Depleted',
              `No additional stock available for ${targetLine.titleEn}. Total available units already in cart.`,
              false
            );
            return;
          }
        }

        const newLineId = `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newLine: CartLineItem = {
          ...targetLine,
          lineId: newLineId,
          quantity: 1,
          eye: newEye,
          power: chosenPower,
          isPlano: chosenPlano,
          lensSummary: formatOpticalSpecs({
            eye: newEye,
            power: chosenPower,
            cylinder: targetLine.cylinder,
            axis: targetLine.axis,
            addPower: targetLine.addPower,
            isPlano: chosenPlano,
            productType: targetLine.productType,
          }) || 'Standard',
        };

        const updatedLines = lines.map((l) => {
          if (l.lineId === targetLine.lineId && l.eye !== updatedTargetEye) {
            return {
              ...l,
              eye: updatedTargetEye,
              lensSummary: formatOpticalSpecs({
                eye: updatedTargetEye,
                power: l.power,
                cylinder: l.cylinder,
                axis: l.axis,
                addPower: l.addPower,
                isPlano: l.isPlano,
                productType: l.productType,
              }) || 'Standard',
            };
          }
          return l;
        });

        const targetIndex = updatedLines.findIndex((l) => l.lineId === targetLine.lineId);
        if (targetIndex >= 0) {
          updatedLines.splice(targetIndex + 1, 0, newLine);
        } else {
          updatedLines.push(newLine);
        }

        const { lines: finalLines, selectedLineId: finalSelectedId } = consolidateLines(updatedLines, newLineId);

        set({
          lines: finalLines,
          selectedLineId: finalSelectedId,
        });

        get().showToast(
          'Added Other Eye',
          `Added line for ${targetLine.titleEn} (${newEye}). Set power in RX CONFIG.`,
          true
        );
      },

      setLineEye: (lineId, eye) => {
        const { lines } = get();
        const currentLine = lines.find((l) => l.lineId === lineId);
        if (!currentLine) return;

        const newEye = currentLine.eye === eye ? '' : eye;
        const updatedLines = lines.map((l) => {
          if (l.lineId !== lineId) return l;
          return {
            ...l,
            eye: newEye,
            lensSummary: formatOpticalSpecs({
              eye: newEye,
              power: l.power,
              cylinder: l.cylinder,
              axis: l.axis,
              addPower: l.addPower,
              isPlano: l.isPlano,
              productType: l.productType,
            }) || (isOpticalProduct(l) ? 'Standard' : ''),
          };
        });

        // Automatically consolidate identical lines if user sets eye to match an existing line!
        const { lines: mergedLines, selectedLineId, didMerge } = consolidateLines(updatedLines, lineId);
        set({ lines: mergedLines, selectedLineId });

        if (didMerge) {
          get().showToast(
            'Lines Combined',
            `Combined identical ${currentLine.titleEn} (${newEye || 'Standard'}) items into 1 cart line.`,
            true
          );
        }
      },

      updateLineSpecs: (lineId, partialSpecs) => {
        const { lines } = get();
        const currentLine = lines.find((l) => l.lineId === lineId);
        if (!currentLine) return;

        const updatedLines = lines.map((l) => {
          if (l.lineId !== lineId) return l;
          const updated = { ...l, ...partialSpecs };
          if (partialSpecs.power !== undefined) {
            if (partialSpecs.power === '0.00' || partialSpecs.power?.toLowerCase().includes('plano')) {
              updated.isPlano = true;
            } else if (partialSpecs.power) {
              updated.isPlano = false;
            }
          }
          if (partialSpecs.isPlano === true) {
            updated.power = '0.00';
          }

          updated.lensSummary = formatOpticalSpecs({
            eye: updated.eye,
            power: updated.power,
            cylinder: updated.cylinder,
            axis: updated.axis,
            addPower: updated.addPower,
            isPlano: updated.isPlano,
            productType: updated.productType,
          }) || (isOpticalProduct(updated) ? 'Standard' : '');

          return updated;
        });

        // Automatically consolidate identical lines if new specs match an existing line!
        const { lines: mergedLines, selectedLineId, didMerge } = consolidateLines(updatedLines, lineId);
        set({ lines: mergedLines, selectedLineId });

        if (didMerge) {
          get().showToast(
            'Lines Combined',
            `Combined identical ${currentLine.titleEn} items into 1 cart line.`,
            true
          );
        }
      },

      updateLineQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeLine(lineId);
          return;
        }

        const { lines } = get();
        const line = lines.find((l) => l.lineId === lineId);
        if (!line) return;

        const totalStock = getAvailableStockForLine(line);
        const usedByOthers = getOtherLinesStockUsage(line, lines);
        const maxAllowed = Math.max(0, totalStock - usedByOthers);

        if (quantity > maxAllowed) {
          get().showToast(
            'Stock Limit',
            `Only ${maxAllowed} available for ${line.titleEn} (${line.power || 'Plano'}).`,
            false
          );
          set({
            lines: lines.map((l) => (l.lineId === lineId ? { ...l, quantity: Math.max(1, maxAllowed) } : l)),
          });
          return;
        }

        set({
          lines: lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
        });
      },

      incrementLineQuantity: (lineId, delta) => {
        const { lines } = get();
        const line = lines.find((l) => l.lineId === lineId);
        if (!line) return;

        const totalStock = getAvailableStockForLine(line);
        const usedByOthers = getOtherLinesStockUsage(line, lines);
        const maxAllowed = Math.max(0, totalStock - usedByOthers);
        const targetQty = line.quantity + delta;

        if (delta > 0 && targetQty > maxAllowed) {
          get().showToast(
            'Stock Limit',
            `Maximum in-stock quantity reached (${maxAllowed} available).`,
            false
          );
          return;
        }

        get().updateLineQuantity(lineId, targetQty);
      },

      removeLine: (lineId) => {
        const remaining = get().lines.filter((l) => l.lineId !== lineId);
        set({
          lines: remaining,
          selectedLineId: remaining.length > 0 ? remaining[remaining.length - 1].lineId : null,
        });
      },

      setSelectedLineId: (lineId) => set({ selectedLineId: lineId }),

      clearCart: () =>
        set({
          lines: [],
          selectedLineId: null,
          customerName: 'Walk-in Customer',
          customerPhone: '',
          customerEmail: '',
          customerId: null,
          customerStoreCredit: 0,
          discountAmount: 0,
          deliveryFee: 0,
        }),

      setCustomer: (customer) =>
        set({
          customerId: customer.id || null,
          customerName: customer.name || 'Walk-in Customer',
          customerPhone: customer.phone || '',
          customerEmail: customer.email || '',
          customerStoreCredit: customer.storeCreditQar || 0,
        }),

      setDiscount: (amount, type = 'FIXED') =>
        set({
          discountAmount: Math.max(0, amount),
          discountType: type,
        }),

      setDeliveryFee: (fee) => set({ deliveryFee: Math.max(0, fee) }),

      holdCurrentSale: () => {
        const { lines, customerName, customerPhone, customerEmail, deliveryFee, getGrandTotal, getItemCount } = get();
        if (lines.length === 0) return false;

        const total = getGrandTotal();
        const itemCount = getItemCount();
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

        const held: HeldSaleItem = {
          id: `HOLD_${Date.now()}`,
          heldAt: now.toISOString(),
          customerName,
          customerPhone,
          customerEmail,
          lines: [...lines],
          total,
          deliveryFee,
          itemCount,
          displaySummary: `${customerName} • ${itemCount} item${itemCount === 1 ? '' : 's'} • ${total.toFixed(2)} QAR (${timeStr})`,
        };

        set((state) => ({
          heldSales: [held, ...state.heldSales],
        }));

        get().clearCart();
        return true;
      },

      recallSale: (id) => {
        const sale = get().heldSales.find((s) => s.id === id);
        if (!sale) return;

        set((state) => ({
          lines: sale.lines,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          customerEmail: sale.customerEmail || '',
          deliveryFee: sale.deliveryFee,
          selectedLineId: sale.lines.length > 0 ? sale.lines[0].lineId : null,
          heldSales: state.heldSales.filter((s) => s.id !== id),
          isHeldSalesModalOpen: false,
        }));
      },

      removeHeldSale: (id) =>
        set((state) => ({
          heldSales: state.heldSales.filter((s) => s.id !== id),
        })),

      setPaymentModalOpen: (open) => set({ isPaymentModalOpen: open }),
      setLensConfigModalOpen: (open, product = null) =>
        set({ isLensConfigModalOpen: open, selectedProductForConfig: product }),
      setCustomerModalOpen: (open) => set({ isCustomerModalOpen: open }),
      setHeldSalesModalOpen: (open) => set({ isHeldSalesModalOpen: open }),
      setExpenseModalOpen: (open) => set({ isExpenseModalOpen: open }),
      setTillActionModalOpen: (open) => set({ isTillActionModalOpen: open }),
      setShiftModalOpen: (open) => set({ isShiftModalOpen: open }),
      setReceiptModalOpen: (open, receipt = null) =>
        set({ isReceiptModalOpen: open, completedReceipt: receipt }),

      showToast: (title, message, isSuccess = true) => {
        set({ toast: { title, message, isSuccess, visible: true } });
        setTimeout(() => {
          set((state) => (state.toast ? { toast: { ...state.toast, visible: false } } : {}));
        }, 3500);
      },
      hideToast: () => set((state) => (state.toast ? { toast: { ...state.toast, visible: false } } : {})),

      getSubtotal: () => {
        return get().lines.reduce((sum, item) => sum + (item.unitPrice + item.lensPrice) * item.quantity, 0);
      },

      getDiscountTotal: () => {
        const subtotal = get().getSubtotal();
        const { discountAmount, discountType } = get();
        if (discountType === 'PERCENT') {
          return Math.round(((subtotal * discountAmount) / 100) * 100) / 100;
        }
        return Math.min(subtotal, discountAmount);
      },

      getTaxTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountTotal();
        const taxable = Math.max(0, subtotal - discount);
        return Math.round(((taxable * get().taxRate) / 100) * 100) / 100;
      },

      getGrandTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountTotal();
        const tax = get().getTaxTotal();
        const { deliveryFee } = get();
        return Math.max(0, Math.round((subtotal - discount + tax + deliveryFee) * 100) / 100);
      },

      getItemCount: () => {
        return get().lines.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'eyenova-pos-cart-storage',
      partialize: (state) => ({
        lines: state.lines,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerEmail: state.customerEmail,
        heldSales: state.heldSales,
        deliveryFee: state.deliveryFee,
        discountAmount: state.discountAmount,
        discountType: state.discountType,
      }),
    }
  )
);
