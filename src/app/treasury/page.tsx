'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar } from '@/lib/utils';
import { DataTable, Column } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Landmark, Plus, Check, Loader2, Banknote, Building2 } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

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
    let active = true;
    fetch('/api/treasury')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.treasury) {
          setCashBalance(data.treasury.cashBalanceQar || 0);
          setBankBalance(data.treasury.bankBalanceQar || 0);
        }
        if (data.movements) {
          setAuditLog(data.movements);
        }
      })
      .catch((err) => console.error('Failed to load treasury:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
      priority: 'standard',
      className: 'w-32 text-stone-700 whitespace-nowrap',
      render: (m) => <span className="truncate block text-xs">{m.operator}</span>,
    },
    {
      key: 'notes',
      header: 'Notes / Reference',
      priority: 'wide',
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
        {/* Balances KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
          <KpiCard
            label="Total Liquid Treasury"
            value={formatQar(totalLiquid)}
            sublabel="Consolidated Cash + Bank"
            tone="teal"
            icon={<Landmark size={15} />}
            className="col-span-2 sm:col-span-1"
          />
          <KpiCard
            label="Physical Cash Drawers"
            value={formatQar(cashBalance)}
            sublabel="Store float & register cash"
            icon={<Banknote size={15} />}
          />
          <KpiCard
            label="Bank Settlement"
            value={formatQar(bankBalance)}
            sublabel="Card & terminal settlements"
            tone="emerald"
            icon={<Building2 size={15} />}
          />
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
            loading={loading}
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
      <ResponsiveDialog
        open={isDropModalOpen}
        onClose={() => setIsDropModalOpen(false)}
        maxWidthClass="sm:max-w-md"
        icon={<Landmark size={16} className="text-teal-700" />}
        title="Record Store Vault Safe Drop"
        subtitle="Treasury Cash & Bank Allocation"
        bodyClassName="p-4 sm:p-5"
      >
        <form onSubmit={handleVaultDrop} className="space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
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
                className={`min-h-[40px] py-2 px-3 rounded-lg border text-xs font-mono font-semibold transition cursor-pointer ${
                  dropChannel === 'CASH'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                Physical Cash Safe
              </button>
              <button
                type="button"
                onClick={() => setDropChannel('BANK')}
                className={`min-h-[40px] py-2 px-3 rounded-lg border text-xs font-mono font-semibold transition cursor-pointer ${
                  dropChannel === 'BANK'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
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
              className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono text-[16px] sm:text-xs focus:bg-white focus:outline-none focus:border-teal-600"
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
              className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[16px] sm:text-xs focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsDropModalOpen(false)}
              className="min-h-[42px] px-4 rounded-lg border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[42px] px-4 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Log Movement</span>
            </button>
          </div>
        </form>
      </ResponsiveDialog>
    </Shell>
  );
}
