'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Loader2, AlertCircle, Building2, CheckSquare, Square } from 'lucide-react';
import { formatQar, formatQatarDateTime } from '@/lib/utils';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  totalQar: number;
  channel: string;
  createdAt: string;
}

interface AggregatorSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceItem[];
  onSettlementSuccess: () => void;
}

const PLATFORMS = [
  { id: 'SNOONU', label: 'Snoonu', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', active: 'bg-red-600 text-white border-red-600' },
  { id: 'TALABAT', label: 'Talabat', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', active: 'bg-orange-600 text-white border-orange-600' },
  { id: 'RAFEEQ', label: 'Rafeeq', color: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100', active: 'bg-rose-800 text-white border-rose-800' },
];

export function AggregatorSettlementModal({
  isOpen,
  onClose,
  invoices,
  onSettlementSuccess,
}: AggregatorSettlementModalProps) {
  const [platform, setPlatform] = useState<'SNOONU' | 'TALABAT' | 'RAFEEQ'>('SNOONU');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [netReceived, setNetReceived] = useState<string>('');
  const [commission, setCommission] = useState<string>('0.00');
  const [statementRef, setStatementRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fetchedInvoices, setFetchedInvoices] = useState<InvoiceItem[] | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetch('/api/invoices?status=PENDING_SETTLEMENT&limit=200')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && Array.isArray(data.invoices)) {
          setFetchedInvoices(data.invoices);
        }
      })
      .catch((err) => console.error('Error fetching pending settlement invoices:', err));
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const activeInvoices = fetchedInvoices || invoices;

  // Pending settlement bills for active platform
  const platformBills = activeInvoices.filter(
    (inv) => inv.status === 'PENDING_SETTLEMENT' && inv.channel?.toUpperCase() === platform
  );

  // When platform changes or modal opens, select all bills for that platform
  useEffect(() => {
    if (isOpen) {
      const allIds = new Set(platformBills.map((b) => b.id));
      setSelectedIds(allIds);
      const gross = platformBills.reduce((sum, b) => sum + b.totalQar, 0);
      setNetReceived(gross.toFixed(2));
      setCommission('0.00');
      setStatementRef(`${platform}-PAYOUT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, platform, activeInvoices.length]);

  const selectedBills = platformBills.filter((b) => selectedIds.has(b.id));
  const grossTotal = selectedBills.reduce((sum, b) => sum + b.totalQar, 0);

  const handleToggleAll = () => {
    if (selectedIds.size === platformBills.length) {
      setSelectedIds(new Set());
      setNetReceived('0.00');
      setCommission('0.00');
    } else {
      const allIds = new Set(platformBills.map((b) => b.id));
      setSelectedIds(allIds);
      setNetReceived(grossTotal.toFixed(2));
      setCommission('0.00');
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);

    const nextSelected = platformBills.filter((b) => next.has(b.id));
    const nextGross = nextSelected.reduce((sum, b) => sum + b.totalQar, 0);
    setNetReceived(nextGross.toFixed(2));
    setCommission('0.00');
  };

  const handleNetReceivedChange = (val: string) => {
    setNetReceived(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      const diff = Math.max(0, grossTotal - parsed);
      setCommission(diff.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setErrorMessage('Please select at least one bill to settle.');
      return;
    }

    const net = parseFloat(netReceived);
    if (isNaN(net) || net < 0) {
      setErrorMessage('Please enter a valid received bank amount.');
      return;
    }

    const comm = parseFloat(commission) || 0;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/invoices/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          invoiceIds: Array.from(selectedIds),
          netAmountReceived: net,
          commissionAmount: comm,
          statementRef: statementRef.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Settlement failed. Please try again.');
      }

      setSuccessMessage(data.message || `Successfully settled ${selectedIds.size} bills.`);
      onSettlementSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                🛵
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Aggregator Payout Settlement &amp; Reconciliation</h3>
                <p className="text-[11px] text-stone-500">
                  تسوية مبيعات منصات التوصيل وإيداع صافي البنك وتوثيق العمولات
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Platform Selection Tabs */}
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1.5 block">
                  Select Delivery Platform / اختر المنصة:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => {
                    const isSelected = platform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id as any)}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                          isSelected ? p.active : p.color
                        }`}
                      >
                        <span>{p.label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                          {activeInvoices.filter((i) => i.status === 'PENDING_SETTLEMENT' && i.channel?.toUpperCase() === p.id).length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selection Bar & Pending Bills Count */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    {selectedIds.size > 0 && selectedIds.size === platformBills.length ? (
                      <CheckSquare size={15} className="text-stone-900" />
                    ) : (
                      <Square size={15} />
                    )}
                    <span>{selectedIds.size === platformBills.length ? 'Deselect All' : 'Select All'}</span>
                  </button>
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-500 font-medium">
                    {selectedIds.size} of {platformBills.length} bills selected
                  </span>
                </div>

                <div className="font-mono text-stone-900 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  Gross: {formatQar(grossTotal)}
                </div>
              </div>

              {/* Pending Bills Table */}
              <div className="border border-stone-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {platformBills.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No pending bills for {platform}. All orders are settled.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-stone-50 text-stone-500 sticky top-0 border-b border-stone-200">
                      <tr>
                        <th className="py-2 px-3 w-8"></th>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3 text-right">Gross Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {platformBills.map((b) => {
                        const isChecked = selectedIds.has(b.id);
                        return (
                          <tr
                            key={b.id}
                            onClick={() => handleToggleRow(b.id)}
                            className={`cursor-pointer transition hover:bg-stone-50 ${
                              isChecked ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleRow(b.id)}
                                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-medium text-stone-900">{b.invoiceNumber}</td>
                            <td className="py-2 px-3 text-stone-500 font-mono text-[10px]">
                              {formatQatarDateTime(b.createdAt)}
                            </td>
                            <td className="py-2 px-3 text-stone-700 truncate max-w-[140px]">{b.customerName}</td>
                            <td className="py-2 px-3 font-mono font-bold text-stone-900 text-right">
                              {formatQar(b.totalQar)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Payout Financial Inputs */}
              <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-800 block mb-1">
                      Net Bank Deposit (QAR)* / صافي المحول للبنك:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={netReceived}
                      onChange={(e) => handleNetReceivedChange(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full h-9 px-3 text-sm font-mono font-bold bg-white border border-stone-300 rounded-md focus:border-stone-900 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      Amount transferred to company bank account
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-800 block mb-1">
                      Commission &amp; Deductions (QAR) / العمولات المقتطعة:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-9 px-3 text-sm font-mono font-bold bg-white border border-stone-300 rounded-md focus:border-stone-900 focus:outline-hidden text-rose-700"
                    />
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      Difference (Gross Total - Bank Deposit)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-800 block mb-1">
                    Statement Ref / Bank Reference # / رقم كشف الحساب:
                  </label>
                  <input
                    type="text"
                    value={statementRef}
                    onChange={(e) => setStatementRef(e.target.value)}
                    placeholder="e.g. SNOONU-OCT-WEEK4"
                    className="w-full h-8 px-3 text-xs font-mono bg-white border border-stone-300 rounded-md focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Error and Success alerts */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-semibold">
                  <Check size={15} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 bg-stone-50/50 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200/60 rounded-md transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedIds.size === 0}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 rounded-md transition shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Processing Settlement...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Reconcile &amp; Settle ({selectedIds.size}) Bills</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
