'use client';

import React, { useState, useMemo } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { ProductItem } from '@/lib/types';
import { Eye, Check } from 'lucide-react';
import {
  getEffectivePriceForPower,
  STANDARD_POWERS,
  STANDARD_CYLINDERS,
  STANDARD_AXES,
  STANDARD_ADDS,
} from '@/lib/utils';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { TouchStepper } from '@/components/ui/touch-stepper';
import { AnimatedCount, AnimatedQar } from '@/components/shared/animated-number';

function LensConfigModalBody({ product }: { product: ProductItem }) {
  const { setLensConfigModalOpen, addLine, showToast } = usePosStore();

  const inStockBatches = useMemo(() => {
    return (product.batches || []).filter((b) => b.quantity > 0);
  }, [product.batches]);

  const { inStockPowers, inStockPowerCounts, isPlanoInStock } = useMemo(() => {
    if (inStockBatches.length > 0) {
      const counts: Record<string, number> = {};
      let planoAvailable = false;

      for (const b of inStockBatches) {
        if (!b.power) continue;
        const p = b.power.trim();
        if (p.toLowerCase().includes('plano') || p === '0.00' || p === '0') {
          planoAvailable = true;
          counts['0.00'] = (counts['0.00'] || 0) + b.quantity;
        } else {
          counts[p] = (counts[p] || 0) + b.quantity;
        }
      }

      const sorted = Object.keys(counts)
        .filter((p) => p !== '0.00')
        .sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          return a.localeCompare(b);
        });

      if (planoAvailable) sorted.unshift('0.00');
      return { inStockPowers: sorted, inStockPowerCounts: counts, isPlanoInStock: planoAvailable };
    }

    const fallbackPowers =
      product.availablePowers && product.availablePowers.length > 0
        ? product.availablePowers
        : STANDARD_POWERS;

    return {
      inStockPowers: fallbackPowers,
      inStockPowerCounts: {},
      isPlanoInStock: product.hasPlanoOption ?? true,
    };
  }, [inStockBatches, product]);

  const firstValid = inStockPowers[0] || '0.00';
  const initialIsPlano = firstValid === '0.00' || firstValid.toLowerCase().includes('plano');

  const [mode, setMode] = useState<'BOTH' | 'OD_ONLY' | 'OS_ONLY'>('BOTH');
  const [odPower, setOdPower] = useState(initialIsPlano ? '0.00' : firstValid);
  const [odCyl, setOdCyl] = useState<string>('');
  const [odAxis, setOdAxis] = useState<number | null>(null);
  const [odAdd, setOdAdd] = useState<string>('');
  const [odBoxes, setOdBoxes] = useState(1);
  const [odIsPlano, setOdIsPlano] = useState(initialIsPlano);

  const [osPower, setOsPower] = useState(initialIsPlano ? '0.00' : firstValid);
  const [osCyl, setOsCyl] = useState<string>('');
  const [osAxis, setOsAxis] = useState<number | null>(null);
  const [osAdd, setOsAdd] = useState<string>('');
  const [osBoxes, setOsBoxes] = useState(1);
  const [osIsPlano, setOsIsPlano] = useState(initialIsPlano);

  const odMatchingPowerBatches = useMemo(() => {
    if (inStockBatches.length === 0) return [];
    const currP = odIsPlano ? '0.00' : odPower || '0.00';
    return inStockBatches.filter((b) => {
      const bP = b.power ? b.power.trim() : '0.00';
      const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
      const normCurr = currP === '0.00' || currP.toLowerCase().includes('plano') ? '0.00' : currP;
      return normBP === normCurr;
    });
  }, [inStockBatches, odIsPlano, odPower]);

  const { odAvailableCylinders, odCylCounts, odHasNoCylinderOption } = useMemo(() => {
    if (odMatchingPowerBatches.length > 0) {
      const counts: Record<string, number> = {};
      let hasNone = false;
      for (const b of odMatchingPowerBatches) {
        if (b.cylinder && b.cylinder.trim() !== '') {
          const c = b.cylinder.trim();
          counts[c] = (counts[c] || 0) + b.quantity;
        } else {
          hasNone = true;
        }
      }
      const sorted = Object.keys(counts).sort((a, b) => parseFloat(a) - parseFloat(b));
      return { odAvailableCylinders: sorted, odCylCounts: counts, odHasNoCylinderOption: hasNone };
    }
    return { odAvailableCylinders: STANDARD_CYLINDERS, odCylCounts: {}, odHasNoCylinderOption: true };
  }, [odMatchingPowerBatches]);

  const odMatchingCylBatches = useMemo(() => {
    if (odMatchingPowerBatches.length === 0) return [];
    const currCyl = odCyl ? odCyl.trim() : null;
    return odMatchingPowerBatches.filter((b) => {
      if (!currCyl) return !b.cylinder || b.cylinder.trim() === '';
      return b.cylinder?.trim() === currCyl;
    });
  }, [odMatchingPowerBatches, odCyl]);

  const { odAvailableAxes, odAxisCounts, odHasNoAxisOption } = useMemo(() => {
    if (odMatchingCylBatches.length > 0) {
      const counts: Record<number, number> = {};
      let hasNone = false;
      for (const b of odMatchingCylBatches) {
        if (b.axis !== null && b.axis !== undefined) {
          counts[b.axis] = (counts[b.axis] || 0) + b.quantity;
        } else {
          hasNone = true;
        }
      }
      const sorted = Object.keys(counts).map(Number).sort((a, b) => a - b);
      return { odAvailableAxes: sorted, odAxisCounts: counts, odHasNoAxisOption: hasNone };
    }
    return { odAvailableAxes: STANDARD_AXES, odAxisCounts: {}, odHasNoAxisOption: true };
  }, [odMatchingCylBatches]);

  const osMatchingPowerBatches = useMemo(() => {
    if (inStockBatches.length === 0) return [];
    const currP = osIsPlano ? '0.00' : osPower || '0.00';
    return inStockBatches.filter((b) => {
      const bP = b.power ? b.power.trim() : '0.00';
      const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
      const normCurr = currP === '0.00' || currP.toLowerCase().includes('plano') ? '0.00' : currP;
      return normBP === normCurr;
    });
  }, [inStockBatches, osIsPlano, osPower]);

  const { osAvailableCylinders, osCylCounts, osHasNoCylinderOption } = useMemo(() => {
    if (osMatchingPowerBatches.length > 0) {
      const counts: Record<string, number> = {};
      let hasNone = false;
      for (const b of osMatchingPowerBatches) {
        if (b.cylinder && b.cylinder.trim() !== '') {
          const c = b.cylinder.trim();
          counts[c] = (counts[c] || 0) + b.quantity;
        } else {
          hasNone = true;
        }
      }
      const sorted = Object.keys(counts).sort((a, b) => parseFloat(a) - parseFloat(b));
      return { osAvailableCylinders: sorted, osCylCounts: counts, osHasNoCylinderOption: hasNone };
    }
    return { osAvailableCylinders: STANDARD_CYLINDERS, osCylCounts: {}, osHasNoCylinderOption: true };
  }, [osMatchingPowerBatches]);

  const osMatchingCylBatches = useMemo(() => {
    if (osMatchingPowerBatches.length === 0) return [];
    const currCyl = osCyl ? osCyl.trim() : null;
    return osMatchingPowerBatches.filter((b) => {
      if (!currCyl) return !b.cylinder || b.cylinder.trim() === '';
      return b.cylinder?.trim() === currCyl;
    });
  }, [osMatchingPowerBatches, osCyl]);

  const { osAvailableAxes, osAxisCounts, osHasNoAxisOption } = useMemo(() => {
    if (osMatchingCylBatches.length > 0) {
      const counts: Record<number, number> = {};
      let hasNone = false;
      for (const b of osMatchingCylBatches) {
        if (b.axis !== null && b.axis !== undefined) {
          counts[b.axis] = (counts[b.axis] || 0) + b.quantity;
        } else {
          hasNone = true;
        }
      }
      const sorted = Object.keys(counts).map(Number).sort((a, b) => a - b);
      return { osAvailableAxes: sorted, osAxisCounts: counts, osHasNoAxisOption: hasNone };
    }
    return { osAvailableAxes: STANDARD_AXES, osAxisCounts: {}, osHasNoAxisOption: true };
  }, [osMatchingCylBatches]);

  const handleOdPowerChange = (newPower: string) => {
    const isPlano = newPower === '0.00' || newPower.toLowerCase().includes('plano');
    setOdPower(isPlano ? '0.00' : newPower);
    setOdIsPlano(isPlano);

    const matching = inStockBatches.filter((b) => {
      const bP = b.power ? b.power.trim() : '0.00';
      const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
      const normNew = isPlano ? '0.00' : newPower;
      return normBP === normNew;
    });

    if (matching.length > 0) {
      const validCyls = matching.map((b) => b.cylinder?.trim()).filter((c): c is string => !!c);
      if (odCyl && !validCyls.includes(odCyl)) {
        setOdCyl(validCyls.length > 0 ? validCyls[0] : '');
      }
      const validAxes = matching
        .filter((b) => (odCyl ? b.cylinder?.trim() === odCyl : !b.cylinder))
        .map((b) => b.axis)
        .filter((a): a is number => a !== null && a !== undefined);
      if (odAxis !== null && !validAxes.includes(odAxis)) {
        setOdAxis(validAxes.length > 0 ? validAxes[0] : null);
      }
    }
  };

  const handleOdCylChange = (newCyl: string) => {
    setOdCyl(newCyl);
    const validAxes = odMatchingPowerBatches
      .filter((b) => (newCyl ? b.cylinder?.trim() === newCyl : !b.cylinder))
      .map((b) => b.axis)
      .filter((a): a is number => a !== null && a !== undefined);
    if (odAxis !== null && !validAxes.includes(odAxis)) {
      setOdAxis(validAxes.length > 0 ? validAxes[0] : null);
    }
  };

  const handleOsPowerChange = (newPower: string) => {
    const isPlano = newPower === '0.00' || newPower.toLowerCase().includes('plano');
    setOsPower(isPlano ? '0.00' : newPower);
    setOsIsPlano(isPlano);

    const matching = inStockBatches.filter((b) => {
      const bP = b.power ? b.power.trim() : '0.00';
      const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
      const normNew = isPlano ? '0.00' : newPower;
      return normBP === normNew;
    });

    if (matching.length > 0) {
      const validCyls = matching.map((b) => b.cylinder?.trim()).filter((c): c is string => !!c);
      if (osCyl && !validCyls.includes(osCyl)) {
        setOsCyl(validCyls.length > 0 ? validCyls[0] : '');
      }
      const validAxes = matching
        .filter((b) => (osCyl ? b.cylinder?.trim() === osCyl : !b.cylinder))
        .map((b) => b.axis)
        .filter((a): a is number => a !== null && a !== undefined);
      if (osAxis !== null && !validAxes.includes(osAxis)) {
        setOsAxis(validAxes.length > 0 ? validAxes[0] : null);
      }
    }
  };

  const handleOsCylChange = (newCyl: string) => {
    setOsCyl(newCyl);
    const validAxes = osMatchingPowerBatches
      .filter((b) => (newCyl ? b.cylinder?.trim() === newCyl : !b.cylinder))
      .map((b) => b.axis)
      .filter((a): a is number => a !== null && a !== undefined);
    if (osAxis !== null && !validAxes.includes(osAxis)) {
      setOsAxis(validAxes.length > 0 ? validAxes[0] : null);
    }
  };

  const powerOptions = useMemo<SelectOption[]>(() => {
    return inStockPowers
      .filter((p) => p !== '0.00' && !p.toLowerCase().includes('plano'))
      .map((p) => {
        const count = inStockPowerCounts[p];
        return {
          value: p,
          label: p,
          subtext: count ? `${count} in stock` : undefined,
        };
      });
  }, [inStockPowers, inStockPowerCounts]);

  const odCylOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (odHasNoCylinderOption) opts.push({ value: '', label: 'None (—)' });
    odAvailableCylinders.forEach((c) => {
      const count = odCylCounts[c];
      opts.push({ value: c, label: c, subtext: count ? `${count} in stock` : undefined });
    });
    return opts;
  }, [odHasNoCylinderOption, odAvailableCylinders, odCylCounts]);

  const odAxisOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (odHasNoAxisOption) opts.push({ value: '', label: 'None (—)' });
    odAvailableAxes.forEach((a) => {
      const count = odAxisCounts[a];
      opts.push({
        value: String(a),
        label: `${a}°`,
        subtext: count ? `${count} in stock` : undefined,
      });
    });
    return opts;
  }, [odHasNoAxisOption, odAvailableAxes, odAxisCounts]);

  const osCylOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (osHasNoCylinderOption) opts.push({ value: '', label: 'None (—)' });
    osAvailableCylinders.forEach((c) => {
      const count = osCylCounts[c];
      opts.push({ value: c, label: c, subtext: count ? `${count} in stock` : undefined });
    });
    return opts;
  }, [osHasNoCylinderOption, osAvailableCylinders, osCylCounts]);

  const osAxisOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (osHasNoAxisOption) opts.push({ value: '', label: 'None (—)' });
    osAvailableAxes.forEach((a) => {
      const count = osAxisCounts[a];
      opts.push({
        value: String(a),
        label: `${a}°`,
        subtext: count ? `${count} in stock` : undefined,
      });
    });
    return opts;
  }, [osHasNoAxisOption, osAvailableAxes, osAxisCounts]);

  const addOptions = useMemo<SelectOption[]>(() => {
    return [{ value: '', label: 'None' }, ...STANDARD_ADDS.map((ad) => ({ value: ad, label: ad }))];
  }, []);

  const isToric =
    product.titleEn.toLowerCase().includes('toric') ||
    product.titleEn.toLowerCase().includes('astigmatism') ||
    product.productType === 'SPECTACLES';

  const isMultifocal =
    product.titleEn.toLowerCase().includes('multifocal') ||
    product.titleEn.toLowerCase().includes('presbyopia');

  const odUnitPrice = getEffectivePriceForPower(
    product,
    odIsPlano ? '0.00' : odPower,
    odCyl,
    odAdd
  );
  const osUnitPrice = getEffectivePriceForPower(
    product,
    osIsPlano ? '0.00' : osPower,
    osCyl,
    osAdd
  );

  const estTotal =
    mode === 'BOTH'
      ? odUnitPrice * odBoxes + osUnitPrice * osBoxes
      : mode === 'OD_ONLY'
      ? odUnitPrice * odBoxes
      : osUnitPrice * osBoxes;

  const handleConfirm = () => {
    if (mode === 'BOTH' || mode === 'OD_ONLY') {
      addLine(product, {
        eye: 'OD',
        power: odIsPlano ? '0.00' : odPower,
        cylinder: odCyl || null,
        axis: odAxis || null,
        addPower: odAdd || null,
        isPlano: odIsPlano,
        quantity: odBoxes,
        unitPrice: odUnitPrice,
      });
    }

    if (mode === 'BOTH' || mode === 'OS_ONLY') {
      addLine(product, {
        eye: 'OS',
        power: osIsPlano ? '0.00' : osPower,
        cylinder: osCyl || null,
        axis: osAxis || null,
        addPower: osAdd || null,
        isPlano: osIsPlano,
        quantity: osBoxes,
        unitPrice: osUnitPrice,
      });
    }

    showToast(
      'Optical Prescription Added',
      `${product.titleEn} (${mode === 'BOTH' ? 'Right & Left Eyes' : mode}) added to cart`,
      true
    );
    setLensConfigModalOpen(false);
  };

  return (
    <ResponsiveDialog
      open={true}
      onClose={() => setLensConfigModalOpen(false)}
      title={product.titleEn}
      subtitle="Configure Dual-Eye Optical Prescription (OD / OS)"
      icon={
        <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center">
          <Eye size={16} />
        </div>
      }
      headerExtra={
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 hidden sm:inline">
          <AnimatedQar value={product.salePriceQar ?? product.basePriceQar} /> / box
        </span>
      }
      maxWidthClass="sm:max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-xs text-stone-600 font-mono flex items-center gap-2">
            <span>
              Total Boxes:{' '}
              <strong className="text-stone-900">
                <AnimatedCount
                  value={mode === 'BOTH' ? odBoxes + osBoxes : mode === 'OD_ONLY' ? odBoxes : osBoxes}
                />
              </strong>
            </span>
            <span className="text-stone-300">·</span>
            <span>
              Est.{' '}
              <strong className="text-teal-700">
                <AnimatedQar value={estTotal} />
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLensConfigModalOpen(false)}
              className="min-h-[42px] px-4 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-medium hover:bg-stone-100 transition cursor-pointer"
            >
              Cancel (Esc)
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial min-h-[42px] px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Check size={14} />
              <span>Add Prescription</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Eye Selection Mode */}
      <div className="bg-stone-50 p-2 border-b border-stone-200 grid grid-cols-3 gap-1.5">
        {(
          [
            { id: 'BOTH', label: 'Both Eyes (OD+OS)' },
            { id: 'OD_ONLY', label: 'Right Eye (OD)' },
            { id: 'OS_ONLY', label: 'Left Eye (OS)' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              mode === m.id
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Dual Eye Configuration Body */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Right Eye (OD) - Precision Teal */}
        {(mode === 'BOTH' || mode === 'OD_ONLY') && (
          <div className="border border-teal-200 bg-teal-50/35 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-teal-200/70 pb-2">
              <span className="font-semibold text-xs text-teal-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-mono flex items-center justify-center text-[10px]">
                  OD
                </span>
                Right Eye
              </span>
              {isPlanoInStock && (
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={odIsPlano}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      handleOdPowerChange(
                        checked
                          ? '0.00'
                          : inStockPowers.find(
                              (p) => p !== '0.00' && !p.toLowerCase().includes('plano')
                            ) || '-0.50'
                      );
                    }}
                    className="rounded border-stone-300 text-teal-700 cursor-pointer"
                  />
                  Plano (0.00)
                </label>
              )}
            </div>

            {!odIsPlano && (
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Sphere Power (SPH)
                </label>
                <SearchableSelect
                  value={odPower}
                  onChange={handleOdPowerChange}
                  options={powerOptions}
                  placeholder="Select SPH..."
                  searchPlaceholder="Search SPH..."
                />
              </div>
            )}

            {isToric && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Cylinder (CYL)
                  </label>
                  <SearchableSelect
                    value={odCyl}
                    onChange={handleOdCylChange}
                    disabled={odAvailableCylinders.length === 0}
                    options={odCylOptions}
                    placeholder="Select CYL..."
                    searchPlaceholder="Search CYL..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Axis (°)
                  </label>
                  <SearchableSelect
                    value={odAxis !== null && odAxis !== undefined ? String(odAxis) : ''}
                    onChange={(val) => setOdAxis(val ? parseInt(val, 10) : null)}
                    disabled={odAvailableAxes.length === 0}
                    options={odAxisOptions}
                    placeholder="Select Axis..."
                    searchPlaceholder="Search Axis..."
                  />
                </div>
              </div>
            )}

            {isMultifocal && (
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Addition (ADD)
                </label>
                <SearchableSelect
                  value={odAdd}
                  onChange={setOdAdd}
                  options={addOptions}
                  placeholder="Select ADD..."
                  searchPlaceholder="Search ADD..."
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-stone-700">Boxes (OD)</span>
              <TouchStepper
                value={odBoxes}
                size="touch"
                onDecrement={() => setOdBoxes((b) => Math.max(1, b - 1))}
                onIncrement={() => setOdBoxes((b) => b + 1)}
                disableDecrement={odBoxes <= 1}
              />
            </div>
          </div>
        )}

        {/* Left Eye (OS) - Warm Stone */}
        {(mode === 'BOTH' || mode === 'OS_ONLY') && (
          <div className="border border-stone-200 bg-stone-50/70 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="font-semibold text-xs text-stone-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-mono flex items-center justify-center text-[10px]">
                  OS
                </span>
                Left Eye
              </span>
              {isPlanoInStock && (
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={osIsPlano}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      handleOsPowerChange(
                        checked
                          ? '0.00'
                          : inStockPowers.find(
                              (p) => p !== '0.00' && !p.toLowerCase().includes('plano')
                            ) || '-0.50'
                      );
                    }}
                    className="rounded border-stone-300 text-stone-900 cursor-pointer"
                  />
                  Plano (0.00)
                </label>
              )}
            </div>

            {!osIsPlano && (
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Sphere Power (SPH)
                </label>
                <SearchableSelect
                  value={osPower}
                  onChange={handleOsPowerChange}
                  options={powerOptions}
                  placeholder="Select SPH..."
                  searchPlaceholder="Search SPH..."
                />
              </div>
            )}

            {isToric && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Cylinder (CYL)
                  </label>
                  <SearchableSelect
                    value={osCyl}
                    onChange={handleOsCylChange}
                    disabled={osAvailableCylinders.length === 0}
                    options={osCylOptions}
                    placeholder="Select CYL..."
                    searchPlaceholder="Search CYL..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Axis (°)
                  </label>
                  <SearchableSelect
                    value={osAxis !== null && osAxis !== undefined ? String(osAxis) : ''}
                    onChange={(val) => setOsAxis(val ? parseInt(val, 10) : null)}
                    disabled={osAvailableAxes.length === 0}
                    options={osAxisOptions}
                    placeholder="Select Axis..."
                    searchPlaceholder="Search Axis..."
                  />
                </div>
              </div>
            )}

            {isMultifocal && (
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Addition (ADD)
                </label>
                <SearchableSelect
                  value={osAdd}
                  onChange={setOsAdd}
                  options={addOptions}
                  placeholder="Select ADD..."
                  searchPlaceholder="Search ADD..."
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-stone-700">Boxes (OS)</span>
              <TouchStepper
                value={osBoxes}
                size="touch"
                onDecrement={() => setOsBoxes((b) => Math.max(1, b - 1))}
                onIncrement={() => setOsBoxes((b) => b + 1)}
                disableDecrement={osBoxes <= 1}
              />
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}

export function LensConfigModal() {
  const { isLensConfigModalOpen, selectedProductForConfig } = usePosStore();

  if (!isLensConfigModalOpen || !selectedProductForConfig) return null;

  return (
    <LensConfigModalBody
      key={selectedProductForConfig.id}
      product={selectedProductForConfig}
    />
  );
}
