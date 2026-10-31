'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Loader2, AlertCircle, ChevronDown, ChevronRight, CheckSquare, Square, Package } from 'lucide-react';
import { formatQar, formatQatarDateTime } from '@/lib/utils';

interface InvoiceProductItem {
  id: string;
  productId: string;
  name: string;
  nameAr?: string | null;
  specs?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

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
  items?: InvoiceProductItem[];
}

interface AggregatorSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceItem[];
  onSettlementSuccess: () => void;
}

interface BillAmountState {
  netReceived: number;
  commission: number;
  commissionPercent: number;
  isExpanded: boolean;
  itemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }>;
}

const PLATFORMS = [
  { id: 'SNOONU', label: 'Snoonu', color: 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50', active: 'bg-red-600 text-white border-red-600 shadow-xs' },
  { id: 'TALABAT', label: 'Talabat', color: 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50', active: 'bg-orange-600 text-white border-orange-600 shadow-xs' },
  { id: 'RAFEEQ', label: 'Rafeeq', color: 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50', active: 'bg-rose-800 text-white border-rose-800 shadow-xs' },
];

export function AggregatorSettlementModal({
  isOpen,
  onClose,
  invoices,
  onSettlementSuccess,
}: AggregatorSettlementModalProps) {
  const [platform, setPlatform] = useState<'SNOONU' | 'TALABAT' | 'RAFEEQ'>('SNOONU');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [billStates, setBillStates] = useState<Record<string, BillAmountState>>({});
  const [netReceivedTotal, setNetReceivedTotal] = useState<string>('');
  const [commissionTotal, setCommissionTotal] = useState<string>('0.00');
  const [commissionPercentTotal, setCommissionPercentTotal] = useState<string>('0.00');
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

  // Initialize or reset bill amounts when platform or modal changes
  useEffect(() => {
    if (isOpen) {
      const allIds = new Set(platformBills.map((b) => b.id));
      setSelectedIds(allIds);

      const newStates: Record<string, BillAmountState> = {};
      let totalGross = 0;

      for (const b of platformBills) {
        totalGross += b.totalQar;
        const itemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }> = {};
        if (b.items && b.items.length > 0) {
          for (const it of b.items) {
            itemAmounts[it.id] = { netReceived: it.total, commission: 0, commissionPercent: 0 };
          }
        }
        newStates[b.id] = {
          netReceived: b.totalQar,
          commission: 0,
          commissionPercent: 0,
          isExpanded: false,
          itemAmounts,
        };
      }

      setBillStates(newStates);
      setNetReceivedTotal(totalGross.toFixed(2));
      setCommissionTotal('0.00');
      setCommissionPercentTotal('0.00');
      setStatementRef(`${platform}-PAYOUT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, platform, platformBills.length]);

  const selectedBills = platformBills.filter((b) => selectedIds.has(b.id));
  const grossTotal = selectedBills.reduce((sum, b) => sum + b.totalQar, 0);

  const recalculateFromBills = (updatedStates: Record<string, BillAmountState>, currentSelectedIds: Set<string>) => {
    const selBills = platformBills.filter((b) => currentSelectedIds.has(b.id));
    const sumGross = selBills.reduce((sum, b) => sum + b.totalQar, 0);
    const sumNet = selBills.reduce((sum, b) => sum + (updatedStates[b.id]?.netReceived ?? b.totalQar), 0);
    const sumComm = selBills.reduce((sum, b) => sum + (updatedStates[b.id]?.commission ?? 0), 0);
    setNetReceivedTotal(sumNet.toFixed(2));
    setCommissionTotal(sumComm.toFixed(2));
    const pct = sumGross > 0 ? (sumComm / sumGross) * 100 : 0;
    setCommissionPercentTotal(pct.toFixed(2));
  };

  const handleToggleAll = () => {
    if (selectedIds.size === platformBills.length) {
      setSelectedIds(new Set());
      setNetReceivedTotal('0.00');
      setCommissionTotal('0.00');
    } else {
      const allIds = new Set(platformBills.map((b) => b.id));
      setSelectedIds(allIds);
      recalculateFromBills(billStates, allIds);
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
    recalculateFromBills(billStates, next);
  };

  const handleToggleExpandBill = (id: string) => {
    setBillStates((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { netReceived: 0, commission: 0, isExpanded: false, itemAmounts: {} }),
        isExpanded: !prev[id]?.isExpanded,
      },
    }));
  };

  const handleToggleExpandAll = () => {
    const anyCollapsed = platformBills.some((b) => !billStates[b.id]?.isExpanded);
    const updated: Record<string, BillAmountState> = { ...billStates };
    for (const b of platformBills) {
      if (updated[b.id]) {
        updated[b.id] = { ...updated[b.id], isExpanded: anyCollapsed };
      }
    }
    setBillStates(updated);
  };

  // When user edits received amount for a bill
  const handleBillNetReceivedChange = (billId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const bill = platformBills.find((b) => b.id === billId);
    if (!bill) return;

    const comm = Math.max(0, bill.totalQar - val);
    const pct = bill.totalQar > 0 ? Math.round((comm / bill.totalQar) * 100 * 100) / 100 : 0;
    const ratio = bill.totalQar > 0 ? val / bill.totalQar : 1;

    const newItemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }> = {};
    if (bill.items) {
      for (const it of bill.items) {
        const itemNet = Math.round(it.total * ratio * 100) / 100;
        const itemComm = Math.max(0, it.total - itemNet);
        const itemPct = it.total > 0 ? Math.round((itemComm / it.total) * 100 * 100) / 100 : 0;
        newItemAmounts[it.id] = {
          netReceived: itemNet,
          commission: itemComm,
          commissionPercent: itemPct,
        };
      }
    }

    const updated = {
      ...billStates,
      [billId]: {
        ...(billStates[billId] || { isExpanded: false }),
        netReceived: val,
        commission: comm,
        commissionPercent: pct,
        isExpanded: billStates[billId]?.isExpanded ?? false,
        itemAmounts: newItemAmounts,
      },
    };

    setBillStates(updated);
    recalculateFromBills(updated, selectedIds);
  };

  // When user edits commission % for a bill
  const handleBillCommissionPercentChange = (billId: string, valStr: string) => {
    const pct = parseFloat(valStr) || 0;
    const bill = platformBills.find((b) => b.id === billId);
    if (!bill) return;

    const comm = Math.round(bill.totalQar * (pct / 100) * 100) / 100;
    const net = Math.max(0, bill.totalQar - comm);

    const newItemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }> = {};
    if (bill.items) {
      for (const it of bill.items) {
        const itemComm = Math.round(it.total * (pct / 100) * 100) / 100;
        const itemNet = Math.max(0, it.total - itemComm);
        newItemAmounts[it.id] = {
          netReceived: itemNet,
          commission: itemComm,
          commissionPercent: pct,
        };
      }
    }

    const updated = {
      ...billStates,
      [billId]: {
        ...(billStates[billId] || { isExpanded: false }),
        netReceived: net,
        commission: comm,
        commissionPercent: pct,
        isExpanded: billStates[billId]?.isExpanded ?? false,
        itemAmounts: newItemAmounts,
      },
    };

    setBillStates(updated);
    recalculateFromBills(updated, selectedIds);
  };

  // When user edits commission amount for a bill
  const handleBillCommissionChange = (billId: string, valStr: string) => {
    const comm = parseFloat(valStr) || 0;
    const bill = platformBills.find((b) => b.id === billId);
    if (!bill) return;

    const net = Math.max(0, bill.totalQar - comm);
    const pct = bill.totalQar > 0 ? Math.round((comm / bill.totalQar) * 100 * 100) / 100 : 0;
    const ratio = bill.totalQar > 0 ? net / bill.totalQar : 1;

    const newItemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }> = {};
    if (bill.items) {
      for (const it of bill.items) {
        const itemNet = Math.round(it.total * ratio * 100) / 100;
        const itemComm = Math.max(0, it.total - itemNet);
        const itemPct = it.total > 0 ? Math.round((itemComm / it.total) * 100 * 100) / 100 : 0;
        newItemAmounts[it.id] = {
          netReceived: itemNet,
          commission: itemComm,
          commissionPercent: itemPct,
        };
      }
    }

    const updated = {
      ...billStates,
      [billId]: {
        ...(billStates[billId] || { isExpanded: false }),
        netReceived: net,
        commission: comm,
        commissionPercent: pct,
        isExpanded: billStates[billId]?.isExpanded ?? false,
        itemAmounts: newItemAmounts,
      },
    };

    setBillStates(updated);
    recalculateFromBills(updated, selectedIds);
  };

  // When user edits received amount for an individual product in a bill
  const handleItemNetReceivedChange = (billId: string, itemId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const bill = platformBills.find((b) => b.id === billId);
    if (!bill || !bill.items) return;

    const currentBillState = billStates[billId] || {
      netReceived: bill.totalQar,
      commission: 0,
      commissionPercent: 0,
      isExpanded: true,
      itemAmounts: {},
    };

    const targetItem = bill.items.find((it) => it.id === itemId);
    const itemGross = targetItem ? targetItem.total : 0;
    const itemComm = Math.max(0, itemGross - val);
    const itemPct = itemGross > 0 ? Math.round((itemComm / itemGross) * 100 * 100) / 100 : 0;

    const updatedItemAmounts = {
      ...currentBillState.itemAmounts,
      [itemId]: { netReceived: val, commission: itemComm, commissionPercent: itemPct },
    };

    const sumNet = bill.items.reduce(
      (sum, it) => sum + (it.id === itemId ? val : (updatedItemAmounts[it.id]?.netReceived ?? it.total)),
      0
    );
    const sumComm = Math.max(0, bill.totalQar - sumNet);
    const bPct = bill.totalQar > 0 ? Math.round((sumComm / bill.totalQar) * 100 * 100) / 100 : 0;

    const updated = {
      ...billStates,
      [billId]: {
        ...currentBillState,
        netReceived: sumNet,
        commission: sumComm,
        commissionPercent: bPct,
        itemAmounts: updatedItemAmounts,
      },
    };

    setBillStates(updated);
    recalculateFromBills(updated, selectedIds);
  };

  // When user edits commission % for an individual product in a bill
  const handleItemCommissionPercentChange = (billId: string, itemId: string, valStr: string) => {
    const pct = parseFloat(valStr) || 0;
    const bill = platformBills.find((b) => b.id === billId);
    if (!bill || !bill.items) return;

    const currentBillState = billStates[billId] || {
      netReceived: bill.totalQar,
      commission: 0,
      commissionPercent: 0,
      isExpanded: true,
      itemAmounts: {},
    };

    const targetItem = bill.items.find((it) => it.id === itemId);
    const itemGross = targetItem ? targetItem.total : 0;
    const itemComm = Math.round(itemGross * (pct / 100) * 100) / 100;
    const itemNet = Math.max(0, itemGross - itemComm);

    const updatedItemAmounts = {
      ...currentBillState.itemAmounts,
      [itemId]: { netReceived: itemNet, commission: itemComm, commissionPercent: pct },
    };

    const sumNet = bill.items.reduce(
      (sum, it) => sum + (it.id === itemId ? itemNet : (updatedItemAmounts[it.id]?.netReceived ?? it.total)),
      0
    );
    const sumComm = Math.max(0, bill.totalQar - sumNet);
    const bPct = bill.totalQar > 0 ? Math.round((sumComm / bill.totalQar) * 100 * 100) / 100 : 0;

    const updated = {
      ...billStates,
      [billId]: {
        ...currentBillState,
        netReceived: sumNet,
        commission: sumComm,
        commissionPercent: bPct,
        itemAmounts: updatedItemAmounts,
      },
    };

    setBillStates(updated);
    recalculateFromBills(updated, selectedIds);
  };

  // When user edits commission amount for an individual product in a bill
  const handleItemCommissionChange = (billId: string, itemId: string, valStr: string) => {
    const comm = parseFloat(valStr) || 0;
    const bill = platformBills.find((b) => b.id === billId);
    if (!bill || !bill.items) return;

    const currentBillState = billStates[billId] || {
      netReceived: bill.totalQar,
      commission: 0,
      commissionPercent: 0,
      isExpanded: true,
      itemAmounts: {},
    };

    const targetItem = bill.items.find((it) => it.id === itemId);
    const itemGross = targetItem ? targetItem.total : 0;
    const itemNet = Math.max(0, itemGross - comm);
    const itemPct = itemGross > 0 ? Math.round((comm / itemGross) * 100 * 100) / 100 : 0;

    const updatedItemAmounts = {
      ...currentBillState.itemAmounts,
      [itemId]: { netReceived: itemNet, commission: comm, commissionPercent: itemPct },
    };

    const sumNet = bill.items.reduce(
      (sum, it) => sum + (it.id === itemId ? itemNet : (updatedItemAmounts[it.id]?.netReceived ?? it.total)),
      0
    );
    const sumComm = Math.max(0, bill.totalQar - sumNet);
    const bPct = bill.totalQar > 0 ? Math.round((sumComm / bill.totalQar) * 100 * 100) / 100 : 0;

    const updated = {
      ...billStates,
      [billId]: {
        ...currentBillState,
        netReceived: sumNet,
        commission: sumComm,
        commissionPercent: bPct,
        itemAmounts: updatedItemAmounts,
      },
    };

    setBillStates(updated);
    recalculateFromBills(updated, selectedIds);
  };

  // When user edits overall total Commission % at bottom
  const handleCommissionPercentTotalChange = (valStr: string) => {
    setCommissionPercentTotal(valStr);
    const pct = parseFloat(valStr);
    if (isNaN(pct) || grossTotal <= 0) return;

    const comm = Math.round(grossTotal * (pct / 100) * 100) / 100;
    const net = Math.max(0, grossTotal - comm);
    setCommissionTotal(comm.toFixed(2));
    setNetReceivedTotal(net.toFixed(2));

    const updated: Record<string, BillAmountState> = { ...billStates };
    for (const b of selectedBills) {
      const bComm = Math.round(b.totalQar * (pct / 100) * 100) / 100;
      const bNet = Math.max(0, b.totalQar - bComm);
      const itemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }> = {};

      if (b.items) {
        for (const it of b.items) {
          const itComm = Math.round(it.total * (pct / 100) * 100) / 100;
          const itNet = Math.max(0, it.total - itComm);
          itemAmounts[it.id] = { netReceived: itNet, commission: itComm, commissionPercent: pct };
        }
      }

      updated[b.id] = {
        ...(updated[b.id] || { isExpanded: false }),
        netReceived: bNet,
        commission: bComm,
        commissionPercent: pct,
        isExpanded: updated[b.id]?.isExpanded ?? false,
        itemAmounts,
      };
    }

    setBillStates(updated);
  };

  // When user edits overall total Commission QAR at bottom
  const handleCommissionTotalChange = (valStr: string) => {
    setCommissionTotal(valStr);
    const comm = parseFloat(valStr);
    if (isNaN(comm) || grossTotal <= 0) return;

    const net = Math.max(0, grossTotal - comm);
    setNetReceivedTotal(net.toFixed(2));
    const pct = Math.round((comm / grossTotal) * 100 * 100) / 100;
    setCommissionPercentTotal(pct.toFixed(2));

    const ratio = net / grossTotal;
    const updated: Record<string, BillAmountState> = { ...billStates };

    for (const b of selectedBills) {
      const bNet = Math.round(b.totalQar * ratio * 100) / 100;
      const bComm = Math.max(0, b.totalQar - bNet);
      const bPct = b.totalQar > 0 ? Math.round((bComm / b.totalQar) * 100 * 100) / 100 : 0;
      const itemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }> = {};

      if (b.items) {
        for (const it of b.items) {
          const itNet = Math.round(it.total * ratio * 100) / 100;
          const itComm = Math.max(0, it.total - itNet);
          const itPct = it.total > 0 ? Math.round((itComm / it.total) * 100 * 100) / 100 : 0;
          itemAmounts[it.id] = { netReceived: itNet, commission: itComm, commissionPercent: itPct };
        }
      }

      updated[b.id] = {
        ...(updated[b.id] || { isExpanded: false }),
        netReceived: bNet,
        commission: bComm,
        commissionPercent: bPct,
        isExpanded: updated[b.id]?.isExpanded ?? false,
        itemAmounts,
      };
    }

    setBillStates(updated);
  };

  // When user edits overall total Net Received at bottom
  const handleNetReceivedTotalChange = (valStr: string) => {
    setNetReceivedTotal(valStr);
    const val = parseFloat(valStr);
    if (isNaN(val) || grossTotal <= 0) return;

    const comm = Math.max(0, grossTotal - val);
    setCommissionTotal(comm.toFixed(2));
    const pct = Math.round((comm / grossTotal) * 100 * 100) / 100;
    setCommissionPercentTotal(pct.toFixed(2));

    const ratio = val / grossTotal;
    const updated: Record<string, BillAmountState> = { ...billStates };

    for (const b of selectedBills) {
      const bNet = Math.round(b.totalQar * ratio * 100) / 100;
      const bComm = Math.max(0, b.totalQar - bNet);
      const bPct = b.totalQar > 0 ? Math.round((bComm / b.totalQar) * 100 * 100) / 100 : 0;
      const itemAmounts: Record<string, { netReceived: number; commission: number; commissionPercent: number }> = {};

      if (b.items) {
        for (const it of b.items) {
          const itNet = Math.round(it.total * ratio * 100) / 100;
          const itComm = Math.max(0, it.total - itNet);
          const itPct = it.total > 0 ? Math.round((itComm / it.total) * 100 * 100) / 100 : 0;
          itemAmounts[it.id] = { netReceived: itNet, commission: itComm, commissionPercent: itPct };
        }
      }

      updated[b.id] = {
        ...(updated[b.id] || { isExpanded: false }),
        netReceived: bNet,
        commission: bComm,
        commissionPercent: bPct,
        isExpanded: updated[b.id]?.isExpanded ?? false,
        itemAmounts,
      };
    }

    setBillStates(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setErrorMessage('Please select at least one bill to settle.');
      return;
    }

    const net = parseFloat(netReceivedTotal);
    if (isNaN(net) || net < 0) {
      setErrorMessage('Please enter a valid received bank amount.');
      return;
    }

    const comm = parseFloat(commissionTotal) || 0;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payloadBills = selectedBills.map((b) => {
        const bState = billStates[b.id];
        return {
          invoiceId: b.id,
          invoiceNumber: b.invoiceNumber,
          orderNumber: b.orderNumber,
          grossQar: b.totalQar,
          netReceivedQar: bState?.netReceived ?? b.totalQar,
          commissionQar: bState?.commission ?? 0,
          items: (b.items || []).map((it) => ({
            productId: it.productId,
            title: it.name,
            grossQar: it.total,
            netReceivedQar: bState?.itemAmounts?.[it.id]?.netReceived ?? it.total,
            commissionQar: bState?.itemAmounts?.[it.id]?.commission ?? 0,
          })),
        };
      });

      const res = await fetch('/api/invoices/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          invoiceIds: Array.from(selectedIds),
          netAmountReceived: net,
          commissionAmount: comm,
          statementRef: statementRef.trim() || undefined,
          bills: payloadBills,
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
          className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl">
                🛵
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Aggregator Payout Settlement &amp; Reconciliation</h3>
                <p className="text-[11px] text-stone-500">
                  Select bills from payout statement and track received amounts per bill and product item
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Platform Selection Tabs */}
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1.5 block">
                  Select Delivery Platform:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => {
                    const isSelected = platform === p.id;
                    const count = activeInvoices.filter(
                      (i) => i.status === 'PENDING_SETTLEMENT' && i.channel?.toUpperCase() === p.id
                    ).length;

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
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            isSelected ? 'bg-black/20 text-white' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selection Bar & Pending Bills Summary */}
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
                  <button
                    type="button"
                    onClick={handleToggleExpandAll}
                    className="text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    Expand/Collapse Products
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

              {/* Pending Bills Table with Itemized Product Breakdown */}
              <div className="border border-stone-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                {platformBills.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No pending bills for {platform}. All orders are settled.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 text-[11px]">
                    {platformBills.map((b) => {
                      const isChecked = selectedIds.has(b.id);
                      const bState = billStates[b.id] || {
                        netReceived: b.totalQar,
                        commission: 0,
                        isExpanded: false,
                        itemAmounts: {},
                      };

                      return (
                        <div key={b.id} className={`transition ${isChecked ? 'bg-stone-50/70' : 'bg-white opacity-70'}`}>
                          {/* Main Bill Header Row */}
                          <div className="p-2.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleRow(b.id)}
                                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                              />

                              <button
                                type="button"
                                onClick={() => handleToggleExpandBill(b.id)}
                                className="p-1 hover:bg-stone-200/60 rounded text-stone-500 transition cursor-pointer shrink-0"
                                title="Toggle product items"
                              >
                                {bState.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>

                              <div className="min-w-0">
                                <span className="font-mono font-bold text-stone-900 block truncate">
                                  {b.invoiceNumber}
                                </span>
                                <span className="text-[10px] text-stone-500 block truncate">
                                  {formatQatarDateTime(b.createdAt)} • {b.customerName}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-[9px] text-stone-500 block">Gross</span>
                                <span className="font-mono font-bold text-stone-900 text-xs">
                                  {formatQar(b.totalQar)}
                                </span>
                              </div>

                              <div className="text-right">
                                <label className="text-[9px] text-emerald-800 font-semibold block">Net Received</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={bState.netReceived}
                                  onChange={(e) => handleBillNetReceivedChange(b.id, e.target.value)}
                                  className="w-20 h-7 px-1.5 text-xs font-mono font-bold text-emerald-700 bg-white border border-emerald-300 rounded text-right focus:border-emerald-600 focus:outline-hidden"
                                />
                              </div>

                              <div className="text-right">
                                <label className="text-[9px] text-rose-700 font-semibold block">Comm %</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={bState.commissionPercent || 0}
                                  onChange={(e) => handleBillCommissionPercentChange(b.id, e.target.value)}
                                  className="w-14 h-7 px-1 text-xs font-mono font-bold text-rose-700 bg-white border border-rose-300 rounded text-right focus:border-rose-600 focus:outline-hidden"
                                />
                              </div>

                              <div className="text-right">
                                <label className="text-[9px] text-rose-700 font-semibold block">Comm (QAR)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={bState.commission}
                                  onChange={(e) => handleBillCommissionChange(b.id, e.target.value)}
                                  className="w-20 h-7 px-1.5 text-xs font-mono font-bold text-rose-700 bg-white border border-rose-300 rounded text-right focus:border-rose-600 focus:outline-hidden"
                                />
                              </div></div>
                          </div>

                          {/* Expanded Items Breakdown */}
                          {bState.isExpanded && b.items && b.items.length > 0 && (
                            <div className="bg-stone-100/70 border-t border-stone-200/80 px-4 py-2 space-y-1.5">
                              <div className="text-[10px] font-bold text-stone-700 flex items-center gap-1">
                                <Package size={11} className="text-stone-500" />
                                <span>Product Line Items (Edit item received amount if listed on statement):</span>
                              </div>
                              <div className="space-y-1">
                                {b.items.map((it) => {
                                  const itState = bState.itemAmounts?.[it.id] || {
                                    netReceived: it.total,
                                    commission: 0,
                                  };

                                  return (
                                    <div
                                      key={it.id}
                                      className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-white border border-stone-200 text-[10px]"
                                    >
                                      <div className="min-w-0 flex-1 truncate">
                                        <span className="font-medium text-stone-900">{it.name}</span>
                                        <span className="text-stone-500 ml-1.5">x{it.quantity}</span>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                          <span className="text-stone-500 font-mono">{formatQar(it.total)}</span>
                                        </div>

                                        <div className="text-right">
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            title="Net received for this product"
                                            value={itState.netReceived}
                                            onChange={(e) => handleItemNetReceivedChange(b.id, it.id, e.target.value)}
                                            className="w-16 h-6 px-1 text-[11px] font-mono font-bold text-emerald-700 bg-white border border-emerald-300 rounded text-right focus:border-emerald-600 focus:outline-hidden"
                                          />
                                        </div>

                                        <div className="text-right">
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            title="Commission % for this product"
                                            value={itState.commissionPercent || 0}
                                            onChange={(e) => handleItemCommissionPercentChange(b.id, it.id, e.target.value)}
                                            className="w-12 h-6 px-1 text-[11px] font-mono font-bold text-rose-700 bg-white border border-rose-300 rounded text-right focus:border-rose-600 focus:outline-hidden"
                                          />
                                        </div>

                                        <div className="text-right">
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            title="Commission amount in QAR for this product"
                                            value={itState.commission}
                                            onChange={(e) => handleItemCommissionChange(b.id, it.id, e.target.value)}
                                            className="w-16 h-6 px-1 text-[11px] font-mono font-bold text-rose-700 bg-white border border-rose-300 rounded text-right focus:border-rose-600 focus:outline-hidden"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payout & Commission Total Summary Form */}
              <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-800 block mb-1">
                      Total Net Bank Deposit (QAR)* / صافي المحول للبنك:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={netReceivedTotal}
                      onChange={(e) => handleNetReceivedTotalChange(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full h-9 px-3 text-sm font-mono font-bold bg-white border border-stone-300 rounded-md focus:border-stone-900 focus:outline-hidden text-emerald-700"
                    />
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      Sum of all bill received amounts (or enters proportional distribution)
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-stone-800">
                        Platform Commission (% / QAR) / إجمالي العمولات:
                      </label>
                      <div className="flex items-center gap-1">
                        {[15, 18, 20, 22, 25].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleCommissionPercentTotalChange(pct.toString())}
                            className="px-1.5 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={commissionPercentTotal}
                          onChange={(e) => handleCommissionPercentTotalChange(e.target.value)}
                          placeholder="Rate %"
                          className="w-full h-9 px-3 text-sm font-mono font-bold bg-white border border-rose-300 rounded-md focus:border-rose-600 focus:outline-hidden text-rose-700"
                        />
                        <span className="text-[9px] text-stone-500 block mt-0.5">Rate (%)</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={commissionTotal}
                          onChange={(e) => handleCommissionTotalChange(e.target.value)}
                          placeholder="Amount QAR"
                          className="w-full h-9 px-3 text-sm font-mono font-bold bg-white border border-rose-300 rounded-md focus:border-rose-600 focus:outline-hidden text-rose-700"
                        />
                        <span className="text-[9px] text-stone-500 block mt-0.5">Amount (QAR)</span>
                      </div>
                    </div>
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
