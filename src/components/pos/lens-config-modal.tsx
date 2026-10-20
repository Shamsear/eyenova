'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { X, Sparkles, Eye, Check } from 'lucide-react';
import {
  formatQar,
  STANDARD_POWERS,
  STANDARD_CYLINDERS,
  STANDARD_AXES,
  STANDARD_ADDS,
} from '@/lib/utils';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';

export function LensConfigModal() {
  const { isLensConfigModalOpen, selectedProductForConfig, setLensConfigModalOpen, addLine, showToast } =
    usePosStore();

  const [mode, setMode] = useState<'BOTH' | 'OD_ONLY' | 'OS_ONLY'>('BOTH');

  // Right Eye (OD)
  const [odPower, setOdPower] = useState('0.00');
  const [odCyl, setOdCyl] = useState<string>('');
  const [odAxis, setOdAxis] = useState<number | null>(null);
  const [odAdd, setOdAdd] = useState<string>('');
  const [odBoxes, setOdBoxes] = useState(1);
  const [odIsPlano, setOdIsPlano] = useState(false);

  // Left Eye (OS)
  const [osPower, setOsPower] = useState('0.00');
  const [osCyl, setOsCyl] = useState<string>('');
  const [osAxis, setOsAxis] = useState<number | null>(null);
  const [osAdd, setOsAdd] = useState<string>('');
  const [osBoxes, setOsBoxes] = useState(1);
  const [osIsPlano, setOsIsPlano] = useState(false);

  // 1. In-stock batches for the selected product
  const inStockBatches = useMemo(() => {
    return (selectedProductForConfig?.batches || []).filter((b) => b.quantity > 0);
  }, [selectedProductForConfig?.batches]);

  // 2. Extract in-stock powers, counts, and plano availability
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
      selectedProductForConfig?.availablePowers && selectedProductForConfig.availablePowers.length > 0
        ? selectedProductForConfig.availablePowers
        : STANDARD_POWERS;

    return {
      inStockPowers: fallbackPowers,
      inStockPowerCounts: {},
      isPlanoInStock: selectedProductForConfig?.hasPlanoOption ?? true,
    };
  }, [inStockBatches, selectedProductForConfig]);

  // OD Matching Batches for selected OD Power
  const odMatchingPowerBatches = useMemo(() => {
    if (inStockBatches.length === 0) return [];
    const currP = odIsPlano ? '0.00' : (odPower || '0.00');
    return inStockBatches.filter((b) => {
      const bP = b.power ? b.power.trim() : '0.00';
      const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
      const normCurr = currP === '0.00' || currP.toLowerCase().includes('plano') ? '0.00' : currP;
      return normBP === normCurr;
    });
  }, [inStockBatches, odIsPlano, odPower]);

  // OD Available Cylinders
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

  // OD Matching Batches for Power + Cylinder
  const odMatchingCylBatches = useMemo(() => {
    if (odMatchingPowerBatches.length === 0) return [];
    const currCyl = odCyl ? odCyl.trim() : null;
    return odMatchingPowerBatches.filter((b) => {
      if (!currCyl) return !b.cylinder || b.cylinder.trim() === '';
      return b.cylinder?.trim() === currCyl;
    });
  }, [odMatchingPowerBatches, odCyl]);

  // OD Available Axes
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

  // OS Matching Batches for selected OS Power
  const osMatchingPowerBatches = useMemo(() => {
    if (inStockBatches.length === 0) return [];
    const currP = osIsPlano ? '0.00' : (osPower || '0.00');
    return inStockBatches.filter((b) => {
      const bP = b.power ? b.power.trim() : '0.00';
      const normBP = bP === '0.00' || bP.toLowerCase().includes('plano') ? '0.00' : bP;
      const normCurr = currP === '0.00' || currP.toLowerCase().includes('plano') ? '0.00' : currP;
      return normBP === normCurr;
    });
  }, [inStockBatches, osIsPlano, osPower]);

  // OS Available Cylinders
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

  // OS Matching Batches for Power + Cylinder
  const osMatchingCylBatches = useMemo(() => {
    if (osMatchingPowerBatches.length === 0) return [];
    const currCyl = osCyl ? osCyl.trim() : null;
    return osMatchingPowerBatches.filter((b) => {
      if (!currCyl) return !b.cylinder || b.cylinder.trim() === '';
      return b.cylinder?.trim() === currCyl;
    });
  }, [osMatchingPowerBatches, osCyl]);

  // OS Available Axes
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

  useEffect(() => {
    if (selectedProductForConfig) {
      const firstValid = inStockPowers[0] || '0.00';
      const isPlano = firstValid === '0.00' || firstValid.toLowerCase().includes('plano');
      setOdPower(isPlano ? '0.00' : firstValid);
      setOsPower(isPlano ? '0.00' : firstValid);
      setOdIsPlano(isPlano);
      setOsIsPlano(isPlano);
      setOdCyl('');
      setOsCyl('');
      setOdAxis(null);
      setOsAxis(null);
      setOdBoxes(1);
      setOsBoxes(1);
      setMode('BOTH');
    }
  }, [selectedProductForConfig, inStockPowers]);

  const odPowerOptions = useMemo<SelectOption[]>(() => {
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
    if (odHasNoCylinderOption) {
      opts.push({ value: '', label: 'None (—)' });
    }
    odAvailableCylinders.forEach((c) => {
      const count = odCylCounts[c];
      opts.push({
        value: c,
        label: c,
        subtext: count ? `${count} in stock` : undefined,
      });
    });
    return opts;
  }, [odHasNoCylinderOption, odAvailableCylinders, odCylCounts]);

  const odAxisOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (odHasNoAxisOption) {
      opts.push({ value: '', label: 'None (—)' });
    }
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

  const osPowerOptions = useMemo<SelectOption[]>(() => {
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

  const osCylOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (osHasNoCylinderOption) {
      opts.push({ value: '', label: 'None (—)' });
    }
    osAvailableCylinders.forEach((c) => {
      const count = osCylCounts[c];
      opts.push({
        value: c,
        label: c,
        subtext: count ? `${count} in stock` : undefined,
      });
    });
    return opts;
  }, [osHasNoCylinderOption, osAvailableCylinders, osCylCounts]);

  const osAxisOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (osHasNoAxisOption) {
      opts.push({ value: '', label: 'None (—)' });
    }
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
    return [
      { value: '', label: 'None' },
      ...STANDARD_ADDS.map((ad) => ({ value: ad, label: ad })),
    ];
  }, []);

  if (!isLensConfigModalOpen || !selectedProductForConfig) return null;

  const isToric =
    selectedProductForConfig.titleEn.toLowerCase().includes('toric') ||
    selectedProductForConfig.titleEn.toLowerCase().includes('astigmatism') ||
    selectedProductForConfig.productType === 'SPECTACLES';

  const isMultifocal =
    selectedProductForConfig.titleEn.toLowerCase().includes('multifocal') ||
    selectedProductForConfig.titleEn.toLowerCase().includes('presbyopia');

  const handleConfirm = () => {
    if (mode === 'BOTH' || mode === 'OD_ONLY') {
      addLine(selectedProductForConfig, {
        eye: 'OD',
        power: odIsPlano ? '0.00' : odPower,
        cylinder: odCyl || null,
        axis: odAxis || null,
        addPower: odAdd || null,
        isPlano: odIsPlano,
        quantity: odBoxes,
      });
    }

    if (mode === 'BOTH' || mode === 'OS_ONLY') {
      addLine(selectedProductForConfig, {
        eye: 'OS',
        power: osIsPlano ? '0.00' : osPower,
        cylinder: osCyl || null,
        axis: osAxis || null,
        addPower: osAdd || null,
        isPlano: osIsPlano,
        quantity: osBoxes,
      });
    }

    showToast(
      'Optical Prescription Added',
      `${selectedProductForConfig.titleEn} (${mode === 'BOTH' ? 'Right & Left Eyes' : mode}) added to cart`,
      true
    );
    setLensConfigModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Eye size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                {selectedProductForConfig.titleEn}
                <span className="text-[10px] font-normal text-blue-300">
                  {formatQar(selectedProductForConfig.salePriceQar ?? selectedProductForConfig.basePriceQar)} / box
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">Configure Contact Lens Dual-Eye Prescription (OD / OS)</span>
            </div>
          </div>
          <button
            onClick={() => setLensConfigModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Eye Selection Mode */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-center gap-2">
          <button
            onClick={() => setMode('BOTH')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              mode === 'BOTH' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            Both Eyes (OD + OS)
          </button>
          <button
            onClick={() => setMode('OD_ONLY')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              mode === 'OD_ONLY' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            Right Eye Only (OD)
          </button>
          <button
            onClick={() => setMode('OS_ONLY')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              mode === 'OS_ONLY' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            Left Eye Only (OS)
          </button>
        </div>

        {/* Dual Eye Configuration Body */}
        <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Right Eye (OD) */}
          {(mode === 'BOTH' || mode === 'OD_ONLY') && (
            <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    OD
                  </span>
                  Right Eye (Oculus Dexter)
                </span>
                {isPlanoInStock && (
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={odIsPlano}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleOdPowerChange(
                          checked
                            ? '0.00'
                            : inStockPowers.find((p) => p !== '0.00' && !p.toLowerCase().includes('plano')) || '-0.50'
                        );
                      }}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                    Plano (0.00)
                  </label>
                )}
              </div>

              {/* Sphere Power */}
              {!odIsPlano && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sphere Power (SPH)
                  </label>
                  <SearchableSelect
                    value={odPower}
                    onChange={handleOdPowerChange}
                    options={odPowerOptions}
                    placeholder="Select SPH..."
                    searchPlaceholder="Search SPH..."
                  />
                </div>
              )}

              {/* Astigmatism Toric CYL & AXIS */}
              {isToric && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cylinder (CYL)</label>
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
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Axis (°)</label>
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

              {/* Multifocal Add */}
              {isMultifocal && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Addition (ADD)</label>
                  <SearchableSelect
                    value={odAdd}
                    onChange={setOdAdd}
                    options={addOptions}
                    placeholder="Select ADD..."
                    searchPlaceholder="Search ADD..."
                  />
                </div>
              )}

              {/* Boxes Count */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Boxes Quantity (Right Eye)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOdBoxes((b) => Math.max(1, b - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-xs">{odBoxes}</span>
                  <button
                    onClick={() => setOdBoxes((b) => b + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Left Eye (OS) */}
          {(mode === 'BOTH' || mode === 'OS_ONLY') && (
            <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                    OS
                  </span>
                  Left Eye (Oculus Sinister)
                </span>
                {isPlanoInStock && (
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={osIsPlano}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleOsPowerChange(
                          checked
                            ? '0.00'
                            : inStockPowers.find((p) => p !== '0.00' && !p.toLowerCase().includes('plano')) || '-0.50'
                        );
                      }}
                      className="rounded text-purple-600 cursor-pointer"
                    />
                    Plano (0.00)
                  </label>
                )}
              </div>

              {/* Sphere Power */}
              {!osIsPlano && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sphere Power (SPH)
                  </label>
                  <SearchableSelect
                    value={osPower}
                    onChange={handleOsPowerChange}
                    options={osPowerOptions}
                    placeholder="Select SPH..."
                    searchPlaceholder="Search SPH..."
                  />
                </div>
              )}

              {/* Astigmatism Toric CYL & AXIS */}
              {isToric && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cylinder (CYL)</label>
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
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Axis (°)</label>
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

              {/* Multifocal Add */}
              {isMultifocal && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Addition (ADD)</label>
                  <SearchableSelect
                    value={osAdd}
                    onChange={setOsAdd}
                    options={addOptions}
                    placeholder="Select ADD..."
                    searchPlaceholder="Search ADD..."
                  />
                </div>
              )}

              {/* Boxes Count */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Boxes Quantity (Left Eye)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOsBoxes((b) => Math.max(1, b - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-xs">{osBoxes}</span>
                  <button
                    onClick={() => setOsBoxes((b) => b + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Total Boxes:{' '}
            <span className="font-bold text-slate-900">
              {(mode === 'BOTH' ? odBoxes + osBoxes : mode === 'OD_ONLY' ? odBoxes : osBoxes)}
            </span>{' '}
            • Est.{' '}
            <span className="font-bold text-blue-600">
              {formatQar(
                (selectedProductForConfig.salePriceQar ?? selectedProductForConfig.basePriceQar) *
                  (mode === 'BOTH' ? odBoxes + osBoxes : mode === 'OD_ONLY' ? odBoxes : osBoxes)
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLensConfigModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
            >
              Cancel (Esc)
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition"
            >
              <Check size={14} /> Add Prescription to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
