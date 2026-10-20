'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { usePosStore, getAvailableStockForLine, getOtherLinesStockUsage } from '@/stores/pos-store';
import { SearchableSelect, SelectOption } from '@/components/shared/searchable-select';
import {
  formatQar,
  formatOpticalSpecs,
  isOpticalProduct,
  STANDARD_POWERS,
  STANDARD_CYLINDERS,
  STANDARD_AXES,
  STANDARD_ADDS,
} from '@/lib/utils';
import {
  Trash2,
  Plus,
  Minus,
  User,
  PauseCircle,
  PlayCircle,
  Banknote,
  CreditCard,
  Split,
  Printer,
  Tag,
  Truck,
  RotateCcw,
  X,
  Store,
  PhoneCall,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedQar, AnimatedCount } from '@/components/shared/animated-number';

export function CartTable() {
  const {
    lines,
    selectedLineId,
    customerName,
    customerPhone,
    discountAmount,
    discountType,
    deliveryFee,
    taxRate,
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
    getTaxTotal,
    getGrandTotal,
    getItemCount,
    showToast,
  } = usePosStore();

  const [activeChannel, setActiveChannel] = useState<'IN_STORE_POS' | 'TALABAT' | 'SNOONU' | 'RAFEEQ' | 'WHATSAPP' | 'WEBSITE'>('IN_STORE_POS');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountVal, setDiscountVal] = useState('');

  const subtotal = getSubtotal();
  const discountTotal = getDiscountTotal();
  const taxTotal = getTaxTotal();
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
    const currP = selectedLine?.isPlano ? '0.00' : (selectedLine?.power || '0.00');
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
  }, [matchingPowerBatches, selectedLine?.cylinder]);

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

  // SearchableSelect options for PWR, CYL, AXIS
  const pwrSelectOptions = useMemo<SelectOption[]>(() => {
    return inStockPowers.map((pwr) => {
      const isPlano = pwr === '0.00' || pwr.toLowerCase().includes('plano');
      const count = inStockPowerCounts[pwr];
      const normPwr = isPlano ? '0.00' : pwr;
      const currentSelectedPower = selectedLine?.isPlano ? '0.00' : (selectedLine?.power || '0.00');
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
        badge: count !== undefined ? (isUnavailable ? '0 left' : `${availableForLine} pcs`) : undefined,
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

  // Auto-correct to valid in-stock power if current selection is out-of-stock
  useEffect(() => {
    if (!selectedLine || !isSelectedLineOptical) return;
    if (inStockPowers.length === 0) return;

    const currentP = selectedLine.isPlano ? '0.00' : (selectedLine.power || '0.00');
    const isCurrentValid = inStockPowers.some((p) => {
      const normP = p === '0.00' || p.toLowerCase().includes('plano') ? '0.00' : p;
      return normP === currentP;
    });

    if (!isCurrentValid) {
      const firstValid = inStockPowers[0];
      const isPlano = firstValid === '0.00' || firstValid.toLowerCase().includes('plano');
      updateLineSpecs(selectedLine.lineId, {
        power: isPlano ? '0.00' : firstValid,
        isPlano,
      });
    }
  }, [selectedLine?.lineId, inStockPowers, isSelectedLineOptical, selectedLine?.power, selectedLine?.isPlano, updateLineSpecs]);

  // Power Change Handler with Cascading Auto-Update for Cylinder & Axis
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

  // Cylinder Change Handler with Cascading Auto-Update for Axis
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

  // Axis Change Handler
  const handleAxisChange = (newAxisStr: string) => {
    if (!selectedLine) return;
    const newAxis = newAxisStr ? parseInt(newAxisStr, 10) : null;
    updateLineSpecs(selectedLine.lineId, {
      axis: newAxis,
    });
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-white select-none border-l border-stone-200 overflow-hidden">
      {/* 1. Customer Header & Order Channel Strip (Stone Light Style) */}
      <div className="shrink-0 bg-stone-50 border-b border-stone-200 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          {/* Customer Selection Button (F2) */}
          <button
            onClick={() => setCustomerModalOpen(true)}
            className="flex items-center gap-2 hover:bg-stone-100 p-1 rounded-md transition text-left flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
              <User size={12} />
            </div>
            <div className="truncate flex-1 min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-medium text-xs text-stone-900 truncate">{customerName}</span>
                <span className="text-[9px] bg-stone-200 text-stone-600 px-1 rounded font-mono shrink-0">
                  F2
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono block truncate">
                {customerPhone ? customerPhone : 'Attach client'}
              </span>
            </div>
          </button>

          {/* Reset Customer Button */}
          {customerName !== 'Walk-in Customer' && (
            <button
              onClick={() => setCustomer({ name: 'Walk-in Customer', phone: '' })}
              title="Reset client"
              className="p-1 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer shrink-0"
            >
              <X size={13} />
            </button>
          )}

          {/* Held Sales Counter */}
          {heldSales.length > 0 && (
            <button
              onClick={() => setHeldSalesModalOpen(true)}
              className="bg-stone-100 border border-stone-300 text-stone-800 text-[10px] font-mono font-medium px-2 py-0.5 rounded flex items-center gap-1 hover:bg-stone-200 transition cursor-pointer shrink-0"
            >
              <PauseCircle size={11} className="text-amber-600" />
              <span className="tabular-nums">{heldSales.length} Held</span>
            </button>
          )}

          {/* Clear Cart Button */}
          {lines.length > 0 && (
            <button
              onClick={() => clearCart()}
              title="Clear Cart"
              className="p-1 text-stone-400 hover:text-rose-600 rounded transition cursor-pointer shrink-0"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Sales Channel Segment (Single Line without scrollbar) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none text-[10px] pb-0.5">
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
            const isSelected = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  isSelected
                    ? 'bg-stone-900 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Icon size={10} />
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Prescription Config Strip (Swiss Stone Style) */}
      {selectedLine && isSelectedLineOptical && (
        <div className="shrink-0 bg-stone-100/80 border-b border-stone-200 p-2 space-y-1.5">
          {/* Header row: RX CONFIG pill, line title, Other Eye button, Done button */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-stone-900 text-stone-50 text-[9px] font-mono uppercase tracking-wider shrink-0">
                RX Config
              </span>
              <span className="text-xs font-semibold text-stone-900 truncate" title={selectedLine.titleEn}>
                {selectedLine.titleEn}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {(() => {
                const hasMoreInStock = (selectedLine.batches || []).some((b) => {
                  const bP = b.power ? b.power.trim() : '0.00';
                  const bUsed = lines
                    .filter((l) => l.productId === selectedLine.productId && (l.isPlano ? '0.00' : l.power) === bP)
                    .reduce((sum, l) => sum + l.quantity, 0);
                  return (b.quantity || 0) > bUsed;
                });

                return (
                  <button
                    type="button"
                    disabled={!hasMoreInStock}
                    onClick={() => addAnotherEyeLine(selectedLine.lineId)}
                    title={
                      !hasMoreInStock
                        ? 'No additional stock available for this product'
                        : 'Add another box for other eye (OD/OS)'
                    }
                    className="px-2 py-0.5 rounded bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 border border-stone-200 text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={10} />
                    <span>Other Eye</span>
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => setSelectedLineId(null)}
                title="Accept optical specs & close editor"
                className="px-2.5 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-50 text-[10px] font-medium transition cursor-pointer"
              >
                <span>Done</span>
              </button>
            </div>
          </div>

          {/* Parameters & Specs Row: EYE, PWR, CYL, AXIS, Plano */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {/* Eye Selector (OD / OS) */}
            <div className="flex items-center bg-white border border-stone-200 rounded overflow-hidden shrink-0">
              <span className="bg-stone-100 px-1.5 py-0.5 text-[9px] font-mono text-stone-500 border-r border-stone-200">
                Eye
              </span>
              <button
                type="button"
                onClick={() => setLineEye(selectedLine.lineId, 'OD')}
                className={`px-1.5 py-0.5 text-[10px] font-mono transition cursor-pointer ${
                  selectedLine.eye === 'OD'
                    ? 'bg-stone-900 text-stone-50 font-bold'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                OD (R)
              </button>
              <span className="w-px h-3 bg-stone-200" />
              <button
                type="button"
                onClick={() => setLineEye(selectedLine.lineId, 'OS')}
                className={`px-1.5 py-0.5 text-[10px] font-mono transition cursor-pointer ${
                  selectedLine.eye === 'OS'
                    ? 'bg-stone-900 text-stone-50 font-bold'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                OS (L)
              </button>
            </div>

            {/* Power Selector (PWR) */}
            <div className="flex items-center bg-white border border-stone-200 rounded overflow-hidden shrink-0">
              <span className="bg-stone-100 px-1.5 py-0.5 text-[9px] font-mono text-stone-500 border-r border-stone-200">
                PWR
              </span>
              <SearchableSelect
                options={pwrSelectOptions}
                value={selectedLine.isPlano ? '0.00' : (selectedLine.power || '0.00')}
                onChange={(val) => handlePowerChange(val)}
                compact
                searchPlaceholder="PWR..."
                menuWidth={180}
              />
            </div>

            {/* Cylinder Selector (CYL) */}
            <div className="flex items-center bg-white border border-stone-200 rounded overflow-hidden shrink-0">
              <span className="bg-stone-100 px-1.5 py-0.5 text-[9px] font-mono text-stone-500 border-r border-stone-200">
                CYL
              </span>
              <SearchableSelect
                options={cylSelectOptions}
                value={selectedLine.cylinder || ''}
                onChange={(val) => handleCylinderChange(val)}
                disabled={availableCylinders.length === 0}
                compact
                placeholder="None"
                searchPlaceholder="CYL..."
                menuWidth={160}
              />
            </div>

            {/* Axis Selector (AXIS) */}
            <div className="flex items-center bg-white border border-stone-200 rounded overflow-hidden shrink-0">
              <span className="bg-stone-100 px-1.5 py-0.5 text-[9px] font-mono text-stone-500 border-r border-stone-200">
                AXIS
              </span>
              <SearchableSelect
                options={axisSelectOptions}
                value={selectedLine.axis !== null && selectedLine.axis !== undefined ? String(selectedLine.axis) : ''}
                onChange={(val) => handleAxisChange(val)}
                disabled={availableAxes.length === 0}
                compact
                placeholder="None"
                searchPlaceholder="Axis..."
                menuWidth={160}
              />
            </div>

            {/* Plano Toggle Checkbox */}
            {isPlanoInStock && (
              <label className="flex items-center gap-1 bg-white border border-stone-200 rounded px-1.5 py-0.5 cursor-pointer select-none text-[10px] font-mono text-stone-700">
                <input
                  type="checkbox"
                  checked={selectedLine.isPlano}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    handlePowerChange(checked ? '0.00' : (inStockPowers.find((p) => p !== '0.00' && !p.toLowerCase().includes('plano')) || '-0.50'));
                  }}
                  className="rounded border-stone-300 text-stone-900 focus:ring-0 cursor-pointer"
                />
                <span>Plano</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* 3. Cart Line Items List (Scrollable middle container) */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-stone-100">
        {lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-400">
            <span className="text-xs font-medium text-stone-600 block">Cart is empty</span>
            <span className="text-[11px] text-stone-400 font-mono mt-0.5">Scan barcode or tap products to begin</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {lines.map((line) => {
              const isSelected = line.lineId === selectedLineId;
              const lineTotal = line.unitPrice * line.quantity;
              const isOpticalItem = isOpticalProduct(line);
              const opticalSummary = line.lensSummary || (isOpticalItem ? formatOpticalSpecs(line) : '');

              return (
                <motion.div
                  key={line.lineId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedLineId(line.lineId)}
                  className={`p-2 flex items-center justify-between gap-2 transition cursor-pointer min-w-0 ${
                    isSelected ? 'bg-stone-100/90 border-l-2 border-stone-900 ring-1 ring-inset ring-stone-200' : 'hover:bg-stone-50/60'
                  }`}
                >
                  {/* Title & Metadata (Strictly Single-Line) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-xs text-stone-900 truncate block">
                        {line.titleEn}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      {opticalSummary ? (
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-stone-200 text-stone-800 rounded shrink-0 truncate max-w-[120px]">
                          {opticalSummary}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-stone-400 font-mono truncate flex items-center gap-1">
                        <span>{line.brandName || 'Optical'} ·</span>
                        <AnimatedQar value={line.unitPrice} className="text-stone-400" />
                      </span>
                    </div>
                  </div>

                  {/* Stepper + Total (Single-Line) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-stone-200 rounded bg-white">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          incrementLineQuantity(line.lineId, -1);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                      >
                        <Minus size={10} />
                      </button>
                      <AnimatedCount
                        value={line.quantity}
                        className="w-6 justify-center font-mono text-xs font-medium text-stone-900 tabular-nums"
                      />
                      {(() => {
                        const totalStock = getAvailableStockForLine(line);
                        const usedByOthers = getOtherLinesStockUsage(line, lines);
                        const maxAllowed = Math.max(0, totalStock - usedByOthers);
                        const isMaxReached = line.quantity >= maxAllowed;

                        return (
                          <button
                            disabled={isMaxReached}
                            onClick={(e) => {
                              e.stopPropagation();
                              incrementLineQuantity(line.lineId, 1);
                            }}
                            title={isMaxReached ? `Max stock reached (${maxAllowed} pcs)` : 'Add 1 piece'}
                            className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            <Plus size={10} />
                          </button>
                        );
                      })()}
                    </div>

                    <AnimatedQar
                      value={lineTotal}
                      className="font-mono font-medium text-xs text-stone-900 tabular-nums min-w-[55px] justify-end text-right"
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLine(line.lineId);
                      }}
                      title="Remove item"
                      className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* 4. Compact Fixed Bottom Calculations & Action Buttons (PINNED TO BOTTOM) */}
      <div className="shrink-0 border-t border-stone-200 bg-stone-50 p-2 space-y-1.5">
        {/* Subtotal, Discount & Delivery Controls in Compact Format */}
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between items-center text-stone-600 text-[11px]">
            <span className="font-mono text-stone-500">Subtotal</span>
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
                    className="w-16 h-5 px-1 text-[10px] bg-white border border-stone-300 rounded font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={applyDiscountInput}
                    className="px-1.5 py-0.5 text-[9px] bg-stone-900 text-white rounded font-mono cursor-pointer"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(false)}
                    className="px-1 text-[9px] text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    X
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(true)}
                  className="flex items-center gap-1 text-stone-600 hover:text-stone-900 cursor-pointer font-mono text-[10px]"
                >
                  <Tag size={10} />
                  <span>Discount {discountAmount > 0 ? `(${discountAmount}${discountType === 'PERCENT' ? '%' : ''})` : ''}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleDeliveryFee}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition cursor-pointer flex items-center gap-0.5 ${
                  deliveryFee > 0
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                }`}
              >
                <Truck size={9} />
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

        {/* Total Due Banner */}
        <div className="pt-1 border-t border-stone-200 flex items-baseline justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Total Due</span>
          <AnimatedQar value={grandTotal} className="text-base font-semibold text-stone-900 font-mono tabular-nums" />
        </div>

        {/* Unified 5-Action Tender Strip: Hold, Recall, Cash, Card, Split */}
        <div className="grid grid-cols-5 gap-1 pt-0.5 text-[10px] font-medium font-mono">
          <button
            onClick={handleHoldSale}
            disabled={lines.length === 0}
            className="flex items-center justify-center py-1 rounded border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition cursor-pointer min-h-[28px] truncate px-0.5"
            title="Park current cart (F3)"
          >
            Hold (F3)
          </button>
          <button
            onClick={() => setHeldSalesModalOpen(true)}
            className="flex items-center justify-center py-1 rounded border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition cursor-pointer min-h-[28px] truncate px-0.5 gap-0.5"
            title="Recall parked cart (F4)"
          >
            <span>Recall</span>
            {heldSales.length > 0 ? (
              <AnimatedCount value={heldSales.length} prefix="(" suffix=")" />
            ) : (
              <span>(F4)</span>
            )}
          </button>
          <button
            onClick={() => setPaymentModalOpen(true)}
            disabled={lines.length === 0}
            className="flex items-center justify-center py-1 rounded border border-stone-200 bg-white text-stone-800 hover:bg-stone-100 transition disabled:opacity-40 cursor-pointer min-h-[28px] truncate px-0.5"
            title="Tender Cash (F6)"
          >
            Cash (F6)
          </button>
          <button
            onClick={() => setPaymentModalOpen(true)}
            disabled={lines.length === 0}
            className="flex items-center justify-center py-1 rounded border border-stone-200 bg-white text-stone-800 hover:bg-stone-100 transition disabled:opacity-40 cursor-pointer min-h-[28px] truncate px-0.5"
            title="Tender Card (F7)"
          >
            Card (F7)
          </button>
          <button
            onClick={() => setPaymentModalOpen(true)}
            disabled={lines.length === 0}
            className="flex items-center justify-center py-1 rounded border border-stone-200 bg-white text-stone-800 hover:bg-stone-100 transition disabled:opacity-40 cursor-pointer min-h-[28px] truncate px-0.5"
            title="Split Payment (F8)"
          >
            Split (F8)
          </button>
        </div>

        {/* Primary Pay & Print Button (Full-width, Strictly Single-Line) */}
        <button
          onClick={() => setPaymentModalOpen(true)}
          disabled={lines.length === 0}
          className="w-full min-h-[38px] py-1.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-50 font-medium text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
        >
          <Printer size={13} />
          <span>PAY & PRINT (F12)</span>
        </button>
      </div>
    </div>
  );
}
