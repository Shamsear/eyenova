'use client';

import React, { useState, useMemo } from 'react';
import {
  usePosStore,
  getAvailableStockForLine,
  getOtherLinesStockUsage,
} from '@/stores/pos-store';
import { SearchableSelect, SelectOption } from '@/components/shared/searchable-select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { TouchStepper } from '@/components/ui/touch-stepper';
import {
  formatOpticalSpecs,
  isOpticalProduct,
  STANDARD_POWERS,
  STANDARD_CYLINDERS,
  STANDARD_AXES,
} from '@/lib/utils';
import {
  Trash2,
  Plus,
  User,
  PauseCircle,
  Printer,
  Tag,
  Truck,
  RotateCcw,
  X,
  Store,
  PhoneCall,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';

interface CartTableProps {
  onCloseSheet?: () => void;
}

export function CartTable({ onCloseSheet }: CartTableProps) {
  const {
    lines,
    selectedLineId,
    customerName,
    customerPhone,
    discountAmount,
    discountType,
    deliveryFee,
    heldSales,
    incrementLineQuantity,
    updateLineSpecs,
    addAnotherEyeLine,
    setLineEye,
    removeLine,
    setSelectedLineId,
    clearCart,
    setCustomerModalOpen,
    setCustomer,
    setPaymentModalOpen,
    setHeldSalesModalOpen,
    holdCurrentSale,
    setDiscount,
    setDeliveryFee,
    getSubtotal,
    getDiscountTotal,
    getGrandTotal,
    getItemCount,
    showToast,
    orderChannel,
    setOrderChannel,
  } = usePosStore();

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountVal, setDiscountVal] = useState('');
  const [isRxDialogOpen, setIsRxDialogOpen] = useState(false);

  const subtotal = getSubtotal();
  const discountTotal = getDiscountTotal();
  const grandTotal = getGrandTotal();
  const itemCount = getItemCount();

  const handleHoldSale = () => {
    if (lines.length === 0) {
      showToast('Cart is Empty', 'Add items before parking sale', false);
      return;
    }
    const success = holdCurrentSale();
    if (success) {
      showToast('Sale Parked', 'Current sale moved to held queue', true);
    }
  };

  const applyDiscountInput = () => {
    const trimmed = discountVal.trim();
    if (!trimmed) {
      setDiscount(0, 'FIXED');
      setShowDiscountInput(false);
      return;
    }

    if (trimmed.endsWith('%')) {
      const pct = parseFloat(trimmed.replace('%', ''));
      if (!isNaN(pct)) setDiscount(pct, 'PERCENT');
    } else {
      const val = parseFloat(trimmed);
      if (!isNaN(val)) setDiscount(val, 'FIXED');
    }
    setShowDiscountInput(false);
    setDiscountVal('');
  };

  const handleToggleDeliveryFee = () => {
    if (deliveryFee > 0) {
      setDeliveryFee(0);
    } else {
      setDeliveryFee(10);
    }
  };

  const selectedLine = lines.find((l) => l.lineId === selectedLineId);
  const isSelectedLineOptical = selectedLine ? isOpticalProduct(selectedLine) : false;

  // 1. In-stock batches for the currently selected product
  const inStockBatches = useMemo(() => {
    return (selectedLine?.batches || []).filter((b) => (b.quantity ?? 0) > 0);
  }, [selectedLine?.batches]);

  // 2. Derive strictly in-stock powers and availability
  const { inStockPowers, inStockPowerCounts, isPlanoInStock } = useMemo(() => {
    const counts: Record<string, number> = {};
    let planoAvailable = false;

    if (inStockBatches.length > 0) {
      for (const b of inStockBatches) {
        if (!b.power) {
          counts['0.00'] = (counts['0.00'] || 0) + b.quantity;
          planoAvailable = true;
          continue;
        }
        const p = b.power.trim();
        if (p === '0.00' || p.toLowerCase().includes('plano')) {
          counts['0.00'] = (counts['0.00'] || 0) + b.quantity;
          planoAvailable = true;
        } else {
          counts[p] = (counts[p] || 0) + b.quantity;
        }
      }

      const sorted = Object.keys(counts)
        .filter((p) => p !== '0.00')
        .sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numB - numA;
          }
          return a.localeCompare(b);
        });

      if (planoAvailable) {
        sorted.unshift('0.00');
      }

      return { inStockPowers: sorted, inStockPowerCounts: counts, isPlanoInStock: planoAvailable };
    }

    const fallbackPowers =
      selectedLine?.availablePowers && selectedLine.availablePowers.length > 0
        ? selectedLine.availablePowers
        : STANDARD_POWERS;

    return {
      inStockPowers: fallbackPowers,
      inStockPowerCounts: {},
      isPlanoInStock: selectedLine?.hasPlanoOption ?? true,
    };
  }, [inStockBatches, selectedLine]);

  // 3. Batches matching the currently selected power
  const matchingPowerBatches = useMemo(() => {
    if (inStockBatches.length === 0) return [];
    const currP = selectedLine?.isPlano ? '0.00' : selectedLine?.power || '0.00';
    return inStockBatches.filter((b) => {
      const bPower = b.power ? b.power.trim() : '0.00';
      const normBP = bPower === '0.00' || bPower.toLowerCase().includes('plano') ? '0.00' : bPower;
      const normCurr = currP === '0.00' || currP.toLowerCase().includes('plano') ? '0.00' : currP;
      return normBP === normCurr;
    });
  }, [inStockBatches, selectedLine?.isPlano, selectedLine?.power]);

  // 4. Cylinders available for the selected power combo
  const { availableCylinders, cylCounts, hasNoCylinderOption } = useMemo(() => {
    if (matchingPowerBatches.length > 0) {
      const counts: Record<string, number> = {};
      let hasNone = false;

      for (const b of matchingPowerBatches) {
        if (b.cylinder && b.cylinder.trim() !== '') {
          const c = b.cylinder.trim();
          counts[c] = (counts[c] || 0) + b.quantity;
        } else {
          hasNone = true;
        }
      }

      const sorted = Object.keys(counts).sort((a, b) => parseFloat(a) - parseFloat(b));
      return { availableCylinders: sorted, cylCounts: counts, hasNoCylinderOption: hasNone };
    }

    return { availableCylinders: STANDARD_CYLINDERS, cylCounts: {}, hasNoCylinderOption: true };
  }, [matchingPowerBatches]);

  // 5. Batches matching Power + Cylinder combo
  const matchingCylBatches = useMemo(() => {
    if (matchingPowerBatches.length === 0) return [];
    const currCyl = selectedLine?.cylinder ? selectedLine.cylinder.trim() : null;
    return matchingPowerBatches.filter((b) => {
      if (!currCyl) return !b.cylinder || b.cylinder.trim() === '';
      return b.cylinder?.trim() === currCyl;
    });
  }, [matchingPowerBatches, selectedLine]);

  // 6. Axes available for the selected Power + Cylinder combo
  const { availableAxes, axisCounts, hasNoAxisOption } = useMemo(() => {
    if (matchingCylBatches.length > 0) {
      const counts: Record<number, number> = {};
      let hasNone = false;

      for (const b of matchingCylBatches) {
        if (b.axis !== null && b.axis !== undefined) {
          counts[b.axis] = (counts[b.axis] || 0) + b.quantity;
        } else {
          hasNone = true;
        }
      }

      const sorted = Object.keys(counts).map(Number).sort((a, b) => a - b);
      return { availableAxes: sorted, axisCounts: counts, hasNoAxisOption: hasNone };
    }

    return { availableAxes: STANDARD_AXES, axisCounts: {}, hasNoAxisOption: true };
  }, [matchingCylBatches]);

  const pwrSelectOptions = useMemo<SelectOption[]>(() => {
    return inStockPowers.map((pwr) => {
      const isPlano = pwr === '0.00' || pwr.toLowerCase().includes('plano');
      const count = inStockPowerCounts[pwr];
      const normPwr = isPlano ? '0.00' : pwr;
      const currentSelectedPower = selectedLine?.isPlano ? '0.00' : selectedLine?.power || '0.00';
      const isCurrentlySelected = normPwr === currentSelectedPower;

      const otherCartUsage = lines
        .filter(
          (l) =>
            l.lineId !== selectedLine?.lineId &&
            l.productId === selectedLine?.productId &&
            (l.isPlano ? '0.00' : l.power) === normPwr
        )
        .reduce((sum, l) => sum + l.quantity, 0);

      const availableForLine = count !== undefined ? Math.max(0, count - otherCartUsage) : 999;
      const isUnavailable = availableForLine <= 0 && !isCurrentlySelected;

      return {
        value: isPlano ? '0.00' : pwr,
        label: isPlano ? 'Plano (0.00)' : pwr,
        badge:
          count !== undefined ? (isUnavailable ? '0 left' : `${availableForLine} pcs`) : undefined,
        badgeColor: (isUnavailable ? 'rose' : 'emerald') as SelectOption['badgeColor'],
        disabled: isUnavailable,
      };
    });
  }, [inStockPowers, inStockPowerCounts, selectedLine, lines]);

  const cylSelectOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (hasNoCylinderOption) {
      opts.push({ value: '', label: 'None' });
    }
    for (const cyl of availableCylinders) {
      const count = cylCounts[cyl];
      opts.push({
        value: cyl,
        label: cyl,
        badge: count ? `${count} pcs` : undefined,
        badgeColor: 'stone',
      });
    }
    return opts;
  }, [hasNoCylinderOption, availableCylinders, cylCounts]);

  const axisSelectOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (hasNoAxisOption) {
      opts.push({ value: '', label: 'None' });
    }
    for (const ax of availableAxes) {
      const count = axisCounts[ax];
      opts.push({
        value: String(ax),
        label: `${ax}°`,
        badge: count ? `${count} pcs` : undefined,
        badgeColor: 'stone',
      });
    }
    return opts;
  }, [hasNoAxisOption, availableAxes, axisCounts]);

  const handlePowerChange = (newPower: string) => {
    if (!selectedLine) return;
    const isPlano = newPower === '0.00' || newPower.toLowerCase().includes('plano');

    const newMatchingBatches = inStockBatches.filter((b) => {
      const bP = b.power ? b.power.trim() : '0.00';
      const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
      const normNew = isPlano ? '0.00' : newPower;
      return normBP === normNew;
    });

    let newCyl = selectedLine.cylinder || null;
    let newAxis = selectedLine.axis ?? null;

    if (newMatchingBatches.length > 0) {
      const validCyls = newMatchingBatches
        .map((b) => (b.cylinder ? b.cylinder.trim() : null))
        .filter((c): c is string => c !== null && c !== '');

      if (newCyl && !validCyls.includes(newCyl)) {
        newCyl = validCyls.length > 0 ? validCyls[0] : null;
      }

      const validAxes = newMatchingBatches
        .filter((b) => {
          if (!newCyl) return !b.cylinder || b.cylinder.trim() === '';
          return b.cylinder?.trim() === newCyl;
        })
        .map((b) => b.axis)
        .filter((a): a is number => a !== null && a !== undefined);

      if (newAxis !== null && !validAxes.includes(newAxis)) {
        newAxis = validAxes.length > 0 ? validAxes[0] : null;
      }
    }

    updateLineSpecs(selectedLine.lineId, {
      power: isPlano ? '0.00' : newPower,
      isPlano,
      cylinder: newCyl,
      axis: newAxis,
    });
  };

  const handleCylinderChange = (newCylStr: string) => {
    if (!selectedLine) return;
    const cylVal = newCylStr ? newCylStr : null;

    const validAxes = matchingPowerBatches
      .filter((b) => {
        if (!cylVal) return !b.cylinder || b.cylinder.trim() === '';
        return b.cylinder?.trim() === cylVal;
      })
      .map((b) => b.axis)
      .filter((a): a is number => a !== null && a !== undefined);

    let newAxis = selectedLine.axis ?? null;
    if (newAxis !== null && !validAxes.includes(newAxis)) {
      newAxis = validAxes.length > 0 ? validAxes[0] : null;
    }

    updateLineSpecs(selectedLine.lineId, {
      cylinder: cylVal,
      axis: newAxis,
    });
  };

  const handleAxisChange = (newAxisStr: string) => {
    if (!selectedLine) return;
    const newAxis = newAxisStr ? parseInt(newAxisStr, 10) : null;
    updateLineSpecs(selectedLine.lineId, {
      axis: newAxis,
    });
  };

  const hasMoreEyeStock = selectedLine
    ? (selectedLine.batches || []).some((b) => {
        const bP = b.power ? b.power.trim() : '0.00';
        const bUsed = lines
          .filter(
            (l) =>
              l.productId === selectedLine.productId &&
              (l.isPlano ? '0.00' : l.power) === bP
          )
          .reduce((sum, l) => sum + l.quantity, 0);
        return (b.quantity || 0) > bUsed;
      })
    : false;

  const isAggregatorChannel = ['TALABAT', 'SNOONU', 'RAFEEQ'].includes(orderChannel);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-white select-none lg:border-l border-stone-200 overflow-hidden">
      {/* 1. Customer Header, Sales Channel & Compact RX Summary */}
      <div className="shrink-0 bg-stone-50 border-b border-stone-200 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="flex items-center gap-2 hover:bg-stone-100 p-1 rounded-lg transition text-left flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
              <User size={14} />
            </div>
            <div className="truncate flex-1 min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-xs text-stone-900 truncate">
                  {customerName}
                </span>
                <span className="text-[9px] bg-stone-200 text-stone-600 px-1 rounded font-mono shrink-0">
                  F2
                </span>
              </div>
              <span className="text-[11px] text-stone-500 font-mono block truncate">
                {customerPhone ? customerPhone : 'Attach client'}
              </span>
            </div>
          </button>

          {customerName !== 'Walk-in Customer' && (
            <button
              type="button"
              onClick={() => setCustomer({ name: 'Walk-in Customer', phone: '' })}
              title="Reset client"
              aria-label="Reset client"
              className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          )}

          {heldSales.length > 0 && (
            <button
              type="button"
              onClick={() => setHeldSalesModalOpen(true)}
              className="h-8 bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-mono font-semibold px-2 rounded-lg flex items-center gap-1 hover:bg-amber-100 transition cursor-pointer shrink-0"
            >
              <PauseCircle size={12} className="text-amber-600" />
              <span className="tabular-nums">{heldSales.length} Held</span>
            </button>
          )}

          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => clearCart()}
              title="Clear Cart"
              aria-label="Clear Cart"
              className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
            >
              <RotateCcw size={14} />
            </button>
          )}

          {onCloseSheet && (
            <button
              type="button"
              onClick={onCloseSheet}
              className="h-8 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-xs font-medium text-stone-800 cursor-pointer shrink-0"
            >
              Catalog
            </button>
          )}
        </div>

        {/* Sales Channel Segmented Strip */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] pb-0.5">
          {(
            [
              { id: 'IN_STORE_POS', label: 'In-Store', icon: Store },
              { id: 'TALABAT', label: 'Talabat', icon: Truck },
              { id: 'SNOONU', label: 'Snoonu', icon: Truck },
              { id: 'RAFEEQ', label: 'Rafeeq', icon: Truck },
              { id: 'WHATSAPP', label: 'WhatsApp', icon: PhoneCall },
              { id: 'WEBSITE', label: 'Web', icon: Globe },
            ] as const
          ).map((ch) => {
            const Icon = ch.icon;
            const isSelected = orderChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setOrderChannel(ch.id)}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  isSelected
                    ? 'bg-stone-900 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Icon size={11} />
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>

        {isAggregatorChannel && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900">
            <span className="flex items-center gap-1 font-medium truncate">
              <Truck size={11} className="text-amber-700 shrink-0" />
              <span className="truncate">{orderChannel} Receivable (Pending Settlement)</span>
            </span>
            <button
              type="button"
              onClick={handleToggleDeliveryFee}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer shrink-0 ${
                deliveryFee > 0
                  ? 'bg-amber-200 text-amber-950 border border-amber-300 font-bold'
                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
            >
              {deliveryFee > 0 ? 'Deliv: 10 (✕)' : '+10 Deliv'}
            </button>
          </div>
        )}

        {/* Compact 1-Line Precision Teal RX Bar (replaces 110px inline block so cart list stays tall!) */}
        {selectedLine && isSelectedLineOptical && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-teal-700 text-white text-[9px] font-mono uppercase tracking-wider shrink-0">
                RX
              </span>
              <span className="font-mono text-[11px] font-semibold text-teal-950 truncate">
                {formatOpticalSpecs(selectedLine)}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={!hasMoreEyeStock}
                onClick={() => addAnotherEyeLine(selectedLine.lineId)}
                title={
                  !hasMoreEyeStock
                    ? 'No additional stock available for this product'
                    : 'Add another box for other eye (OD/OS)'
                }
                className="h-7 px-2 rounded-lg bg-white hover:bg-teal-100/60 disabled:opacity-40 disabled:cursor-not-allowed text-teal-900 border border-teal-200 text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
              >
                <Plus size={11} />
                <span>2nd Eye</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRxDialogOpen(true)}
                className="h-7 px-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <SlidersHorizontal size={11} />
                <span>Edit RX</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Cart Line Items List (Touch-safe TouchStepper + separated delete) */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-stone-100">
        {lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <span className="text-xs font-semibold text-stone-700 block">Cart is empty</span>
            <span className="text-[11px] text-stone-400 font-mono mt-1">
              Scan barcode or tap products to begin
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {lines.map((line) => {
              const isSelected = line.lineId === selectedLineId;
              const lineTotal = line.unitPrice * line.quantity;
              const isOpticalItem = isOpticalProduct(line);
              const opticalSummary =
                line.lensSummary || (isOpticalItem ? formatOpticalSpecs(line) : '');
              const totalStock = getAvailableStockForLine(line);
              const usedByOthers = getOtherLinesStockUsage(line, lines);
              const maxAllowed = Math.max(0, totalStock - usedByOthers);
              const isMaxReached = line.quantity >= maxAllowed;

              return (
                <motion.div
                  key={line.lineId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setSelectedLineId(line.lineId)}
                  className={`p-2.5 flex items-center justify-between gap-2 transition cursor-pointer min-w-0 ${
                    isSelected
                      ? 'bg-teal-50/35 border-l-2 border-teal-700'
                      : 'hover:bg-stone-50/80'
                  }`}
                >
                  {/* Title & Optical Spec Badge */}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-xs text-stone-900 truncate block">
                      {line.titleEn}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 min-w-0 flex-wrap">
                      {opticalSummary ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLineId(line.lineId);
                            setIsRxDialogOpen(true);
                          }}
                          className="text-[10px] font-mono px-1.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-md hover:bg-teal-100 shrink-0 truncate max-w-[140px] cursor-pointer"
                          title="Tap to edit optical RX"
                        >
                          {opticalSummary}
                        </button>
                      ) : null}
                      <span className="text-[11px] text-stone-400 font-mono truncate flex items-center gap-1">
                        <span>{line.brandName || 'Optical'} ·</span>
                        <AnimatedQar value={line.unitPrice} className="text-stone-500" />
                      </span>
                    </div>
                  </div>

                  {/* Stepper + Total + Separated Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <TouchStepper
                      value={line.quantity}
                      size="touch"
                      onDecrement={(e) => {
                        e.stopPropagation();
                        incrementLineQuantity(line.lineId, -1);
                      }}
                      onIncrement={(e) => {
                        e.stopPropagation();
                        incrementLineQuantity(line.lineId, 1);
                      }}
                      disableIncrement={isMaxReached}
                      incrementTitle={
                        isMaxReached ? `Max stock reached (${maxAllowed} pcs)` : 'Add 1 piece'
                      }
                    />

                    <AnimatedQar
                      value={lineTotal}
                      className="font-mono font-semibold text-xs text-stone-900 tabular-nums min-w-[60px] justify-end text-right"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLine(line.lineId);
                      }}
                      title="Remove item"
                      aria-label={`Remove ${line.titleEn}`}
                      className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* 3. Fixed Bottom Totals & 2-Row Ergonomic Tender Bar */}
      <div className="shrink-0 border-t border-stone-200 bg-stone-50 p-2.5 space-y-2">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center text-stone-600 text-[11px]">
            <span className="font-mono text-stone-500">Subtotal ({itemCount} pcs)</span>
            <AnimatedQar value={subtotal} className="font-mono text-stone-900 tabular-nums" />
          </div>

          <div className="flex justify-between items-center text-stone-600 text-[11px]">
            <div className="flex items-center gap-2">
              {showDiscountInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="10 or 15%"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyDiscountInput();
                      if (e.key === 'Escape') setShowDiscountInput(false);
                    }}
                    className="w-20 h-7 px-2 text-[16px] sm:text-[11px] bg-white border border-stone-300 rounded-md font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={applyDiscountInput}
                    className="h-7 px-2 text-[10px] bg-teal-700 text-white rounded-md font-mono cursor-pointer"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(false)}
                    className="h-7 px-1.5 text-[10px] text-stone-500 hover:text-stone-800 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(true)}
                  className="flex items-center gap-1 text-stone-600 hover:text-stone-900 cursor-pointer font-mono text-[11px]"
                >
                  <Tag size={11} />
                  <span>
                    Discount{' '}
                    {discountAmount > 0
                      ? `(${discountAmount}${discountType === 'PERCENT' ? '%' : ''})`
                      : ''}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleDeliveryFee}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition cursor-pointer flex items-center gap-1 ${
                  deliveryFee > 0
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-200/80 text-stone-600 hover:bg-stone-300'
                }`}
              >
                <Truck size={10} />
                <span>Delivery {deliveryFee > 0 ? '+10' : 'None'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
              {discountTotal > 0 && (
                <AnimatedQar value={discountTotal} prefix="-" className="text-emerald-700" />
              )}
              {deliveryFee > 0 && (
                <AnimatedQar value={deliveryFee} prefix="+" className="text-stone-700" />
              )}
            </div>
          </div>
        </div>

        <div className="pt-1.5 border-t border-stone-200 flex items-baseline justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
            Total Due
          </span>
          <AnimatedQar
            value={grandTotal}
            className="text-lg font-bold text-stone-900 font-mono tabular-nums"
          />
        </div>

        {/* Row 1: Hold / Recall / Pre-selected Tender Methods */}
        <div className="grid grid-cols-5 gap-1.5 text-[11px] font-medium font-mono">
          <button
            type="button"
            onClick={handleHoldSale}
            disabled={lines.length === 0}
            className="min-h-[36px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition cursor-pointer px-1"
            title="Park current cart (F3)"
          >
            Hold
          </button>
          <button
            type="button"
            onClick={() => setHeldSalesModalOpen(true)}
            className="min-h-[36px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition cursor-pointer px-1 gap-0.5"
            title="Recall parked cart (F4)"
          >
            <span>Recall</span>
            {heldSales.length > 0 && (
              <AnimatedCount value={heldSales.length} prefix="(" suffix=")" />
            )}
          </button>
          {isAggregatorChannel ? (
            <div className="col-span-3 min-h-[36px] flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-[10px] font-medium px-1.5 gap-1">
              <Truck size={12} className="text-amber-700 shrink-0" />
              <span className="truncate">Pending Platform Payout</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true, 'CASH')}
                disabled={lines.length === 0}
                className="min-h-[36px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-900 hover:border-teal-700 hover:bg-teal-50/40 transition disabled:opacity-40 cursor-pointer px-1"
                title="Tender Cash (F6)"
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true, 'CARD')}
                disabled={lines.length === 0}
                className="min-h-[36px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-900 hover:border-teal-700 hover:bg-teal-50/40 transition disabled:opacity-40 cursor-pointer px-1"
                title="Tender Card (F7)"
              >
                Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true, 'SPLIT')}
                disabled={lines.length === 0}
                className="min-h-[36px] flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-900 hover:border-teal-700 hover:bg-teal-50/40 transition disabled:opacity-40 cursor-pointer px-1"
                title="Split Payment (F8)"
              >
                Split
              </button>
            </>
          )}
        </div>

        {/* Row 2: Primary Precision Teal Checkout CTA */}
        <button
          type="button"
          onClick={() => setPaymentModalOpen(true)}
          disabled={lines.length === 0}
          className="w-full min-h-[44px] py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
        >
          {isAggregatorChannel ? (
            <>
              <Truck size={14} className="text-teal-100" />
              <span>BILL TO {orderChannel} (PENDING) (F12)</span>
            </>
          ) : (
            <>
              <Printer size={14} />
              <span>PAY &amp; PRINT (F12)</span>
            </>
          )}
        </button>
      </div>

      {/* Dedicated Optical Prescription (RX) Editor Sheet/Modal */}
      <ResponsiveDialog
        open={Boolean(isRxDialogOpen && selectedLine && isSelectedLineOptical)}
        onClose={() => setIsRxDialogOpen(false)}
        title="Optical Prescription (RX)"
        subtitle={selectedLine?.titleEn}
        maxWidthClass="sm:max-w-md"
        bodyClassName="p-4 space-y-4"
        footer={
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!hasMoreEyeStock}
              onClick={() => {
                if (selectedLine) addAnotherEyeLine(selectedLine.lineId);
              }}
              className="min-h-[40px] px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 text-xs font-medium text-stone-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Other Eye</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRxDialogOpen(false)}
              className="min-h-[40px] px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        }
      >
        {selectedLine && isSelectedLineOptical && (
          <>
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block">
                Eye Side
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLineEye(selectedLine.lineId, 'OD')}
                  className={`h-11 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer ${
                    selectedLine.eye === 'OD'
                      ? 'bg-teal-700 border-teal-700 text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  OD (Right Eye)
                </button>
                <button
                  type="button"
                  onClick={() => setLineEye(selectedLine.lineId, 'OS')}
                  className={`h-11 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer ${
                    selectedLine.eye === 'OS'
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  OS (Left Eye)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Sphere (PWR)
                </label>
                <SearchableSelect
                  options={pwrSelectOptions}
                  value={selectedLine.isPlano ? '0.00' : selectedLine.power || '0.00'}
                  onChange={handlePowerChange}
                  searchPlaceholder="PWR..."
                  menuWidth={200}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Cylinder (CYL)
                </label>
                <SearchableSelect
                  options={cylSelectOptions}
                  value={selectedLine.cylinder || ''}
                  onChange={handleCylinderChange}
                  disabled={availableCylinders.length === 0}
                  placeholder="None"
                  searchPlaceholder="CYL..."
                  menuWidth={180}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Axis (°)
                </label>
                <SearchableSelect
                  options={axisSelectOptions}
                  value={
                    selectedLine.axis !== null && selectedLine.axis !== undefined
                      ? String(selectedLine.axis)
                      : ''
                  }
                  onChange={handleAxisChange}
                  disabled={availableAxes.length === 0}
                  placeholder="None"
                  searchPlaceholder="Axis..."
                  menuWidth={180}
                />
              </div>
            </div>

            {isPlanoInStock && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer select-none text-xs font-medium text-stone-800">
                <input
                  type="checkbox"
                  checked={selectedLine.isPlano}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    handlePowerChange(
                      checked
                        ? '0.00'
                        : inStockPowers.find(
                            (p) => p !== '0.00' && !p.toLowerCase().includes('plano')
                          ) || '-0.50'
                    );
                  }}
                  className="w-4 h-4 rounded border-stone-300 text-teal-700 focus:ring-0 cursor-pointer"
                />
                <span>Plano (0.00 Cosmetic / Non-Prescription)</span>
              </label>
            )}
          </>
        )}
      </ResponsiveDialog>
    </div>
  );
}
