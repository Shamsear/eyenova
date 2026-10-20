'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar } from '@/lib/utils';
import { DataTable, Column } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Landmark, Plus, X, Check, Loader2 } from 'lucide-react';

interface AuditMovement {
  id: string;
  timestamp: string;
  type: 'SALE_REVENUE' | 'DRAWER_FLOAT_IN' | 'VAULT_DROP' | 'BANK_DEPOSIT';
  channel: 'CASH' | 'BANK';
  amount: number;
  direction: 'IN' | 'OUT';
  operator: string;
  notes: string;
}

const CHANNEL_FILTERS = [
  { id: 'ALL', label: 'All Channels' },
  { id: 'CASH', label: 'Physical Cash' },
  { id: 'BANK', label: 'Bank Settlement' },
];

export default function TreasuryPage() {
  const [cashBalance, setCashBalance] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [activeChannel, setActiveChannel] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Transfer modal fields
  const [dropChannel, setDropChannel] = useState<'CASH' | 'BANK'>('CASH');
  const [dropAmount, setDropAmount] = useState('');
  const [dropNotes, setDropNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [auditLog, setAuditLog] = useState<AuditMovement[]>([]);

  const loadTreasury = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/treasury');
      const data = await res.json();
      if (data.treasury) {
        setCashBalance(data.treasury.cashBalanceQar || 0);
        setBankBalance(data.treasury.bankBalanceQar || 0);
      }
      if (data.movements) {
        setAuditLog(data.movements);
      }
    } catch (err) {
      console.error('Failed to load treasury:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreasury();
  }, []);

  const totalLiquid = cashBalance + bankBalance;

  const handleVaultDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(dropAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          channel: dropChannel,
          notes: dropNotes || 'Secure cash drop into store vault safe',
          operator: 'Branch Manager',
        }),
      });

      if (res.ok) {
        await loadTreasury();
        setIsDropModalOpen(false);
        setDropAmount('');
        setDropNotes('');
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to record movement');
      }
    } catch (err) {
      console.error('Vault drop error:', err);
      setErrorMessage('Network error while recording movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<AuditMovement>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      className: 'w-40 font-mono text-[11px] text-stone-500 whitespace-nowrap',
      render: (m) => <span className="truncate block">{m.timestamp}</span>,
    },
    {
      key: 'type',
      header: 'Transaction Type',
      className: 'w-44 font-medium text-stone-900 whitespace-nowrap',
      render: (m) => (
        <span className="truncate block font-mono text-xs">
          {m.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      className: 'w-28 whitespace-nowrap',
      render: (m) => (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
          {m.channel}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'w-36 text-right whitespace-nowrap',
      render: (m) => (
        <span className={`font-mono text-xs font-semibold tabular-nums truncate block ${m.direction === 'IN' ? 'text-emerald-700' : 'text-stone-900'}`}>
          {m.direction === 'IN' ? '+' : '-'} {formatQar(m.amount)}
        </span>
      ),
    },
    {
      key: 'operator',
      header: 'Operator',
      className: 'w-32 text-stone-700 whitespace-nowrap',
      render: (m) => <span className="truncate block text-xs">{m.operator}</span>,
    },
    {
      key: 'notes',
      header: 'Notes / Reference',
      className: 'text-stone-500',
      render: (m) => <span className="truncate block text-xs">{m.notes || '—'}</span>,
    },
  ];

  return (
    <Shell
      title="Company Treasury & Financial Vault"
      subtitle="Liquid assets, cash drawer safe balance and double-entry movement log"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 gap-3 sm:gap-4 overflow-hidden bg-stone-100/60">
        {/* Balances Typographic Grid - strictly 1 line */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
          <div className="bg-white p-3.5 rounded-lg border border-stone-200">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Total Liquid Treasury
            </span>
            <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
              {formatQar(totalLiquid)}
            </div>
            <span className="text-[11px] text-stone-500 mt-0.5 block truncate">
              Consolidated Cash + Bank
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-stone-200">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Physical Safe & Cash Drawers
            </span>
            <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
              {formatQar(cashBalance)}
            </div>
            <span className="text-[11px] font-mono text-stone-500 mt-0.5 block truncate">
              Store float & register cash
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-stone-200">
            <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider block truncate">
              Bank Settlement
            </span>
            <div className="text-xl font-mono font-semibold text-stone-900 mt-1 tabular-nums truncate">
              {formatQar(bankBalance)}
            </div>
            <span className="text-[11px] font-mono text-stone-500 mt-0.5 block truncate">
              Card & terminal settlements
            </span>
          </div>
        </div>

        {/* Page Header with Channel Filter, Search and Add Action */}
        <PageHeader
          title="Monetary Movements"
          subtitle={`${auditLog.length} Total`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by operator, reference, type..."
          filters={CHANNEL_FILTERS}
          activeFilter={activeChannel}
          onFilterChange={setActiveChannel}
          primaryAction={{
            label: 'Record Vault Drop',
            icon: Plus,
            onClick: () => {
              setErrorMessage('');
              setIsDropModalOpen(true);
            },
          }}
        />

        {/* Audit Log Table with universal pagination and mobile card view */}
        <div className="flex-1 min-h-0 bg-white border border-stone-200 rounded-lg flex flex-col overflow-hidden">
          <DataTable
            data={auditLog}
            columns={columns}
            keyExtractor={(m) => m.id}
            searchQuery={search}
            searchFields={[
              (m) => m.operator,
              (m) => m.notes,
              (m) => m.type,
              (m) => m.channel,
            ]}
            filterFn={(m) => {
              if (activeChannel === 'ALL') return true;
              return m.channel === activeChannel;
            }}
            pageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyTitle="No movements recorded"
            emptyDescription={loading ? 'Loading movements...' : 'There are no monetary ledger entries.'}
            renderCard={(m) => (
              <>
                <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                  <span className="font-mono font-medium text-xs text-stone-900 truncate">
                    {m.type.replace(/_/g, ' ')}
                  </span>
                  <span className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${m.direction === 'IN' ? 'text-emerald-700' : 'text-stone-900'}`}>
                    {m.direction === 'IN' ? '+' : '-'} {formatQar(m.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] min-w-0 text-stone-600">
                  <span className="truncate">{m.notes || m.operator}</span>
                  <span className="font-mono text-[10px] text-stone-400 shrink-0">{m.channel}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-stone-400 min-w-0">
                  <span className="truncate">{m.operator}</span>
                  <span className="shrink-0">{m.timestamp}</span>
                </div>
              </>
            )}
          />
        </div>
      </div>

      {/* Vault Drop Modal */}
      {isDropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-stone-200 w-full max-w-md overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                <Landmark size={14} className="text-stone-500" />
                <span>Record Store Vault Safe Drop</span>
              </h3>
              <button
                onClick={() => setIsDropModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleVaultDrop} className="p-4 space-y-3 text-xs">
              {errorMessage && (
                <div className="p-2 rounded bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Destination Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDropChannel('CASH')}
                    className={`py-1.5 px-3 rounded border text-xs font-mono font-medium transition cursor-pointer ${
                      dropChannel === 'CASH'
                        ? 'bg-stone-900 text-stone-50 border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Physical Cash Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => setDropChannel('BANK')}
                    className={`py-1.5 px-3 rounded border text-xs font-mono font-medium transition cursor-pointer ${
                      dropChannel === 'BANK'
                        ? 'bg-stone-900 text-stone-50 border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Bank Settlement
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Amount (QAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={dropAmount}
                  onChange={(e) => setDropAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Reference / Reason
                </label>
                <input
                  type="text"
                  value={dropNotes}
                  onChange={(e) => setDropNotes(e.target.value)}
                  placeholder="e.g. End-of-shift register skim into vault"
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:bg-white focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsDropModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Log Movement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
