'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar, formatQatarDateTime } from '@/lib/utils';
import { useSessionStore } from '@/stores/session-store';
import { DataTable, Column } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Wallet, Plus, Loader2, Check, Receipt, Banknote } from 'lucide-react';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import { KpiCard } from '@/components/ui/kpi-card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amountQar: number;
  paymentSource: string;
  receiptNumber?: string | null;
  vendorName?: string | null;
  notes?: string | null;
  userName?: string | null;
  expenseDate: string;
}

const CATEGORIES = [
  'PANTRY_TEA',
  'CLEANING_MAINTENANCE',
  'PACKAGING_BAGS',
  'LOGISTICS_DELIVERY',
  'POS_ROLLS',
  'UTILITIES_KAHRAMAA',
  'RENT',
  'MARKETING_ADS',
  'MISCELLANEOUS',
];

const PAYMENT_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'CASH_DRAWER', label: 'Cash Drawer' },
  { value: 'COMPANY_TREASURY', label: 'Safe Vault' },
  { value: 'CORPORATE_CARD', label: 'Corporate Card' },
];

const CATEGORY_OPTIONS: SelectOption[] = CATEGORIES.map((cat) => ({
  value: cat,
  label: cat.replace(/_/g, ' '),
}));

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'All Expenses' },
  { id: 'PANTRY_TEA', label: 'Pantry' },
  { id: 'CLEANING_MAINTENANCE', label: 'Cleaning' },
  { id: 'PACKAGING_BAGS', label: 'Packaging' },
  { id: 'LOGISTICS_DELIVERY', label: 'Delivery' },
  { id: 'POS_ROLLS', label: 'POS Rolls' },
  { id: 'UTILITIES_KAHRAMAA', label: 'Utilities' },
  { id: 'RENT', label: 'Rent' },
  { id: 'MARKETING_ADS', label: 'Marketing' },
  { id: 'MISCELLANEOUS', label: 'Misc' },
];

export default function ExpensesPage() {
  const { user, store, shift } = useSessionStore();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // New modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('PANTRY_TEA');
  const [paymentSource, setPaymentSource] = useState('CASH_DRAWER');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (data.expenses) setExpenses(data.expenses);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/expenses')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.expenses) setExpenses(data.expenses);
      })
      .catch((err) => console.error('Error fetching expenses:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amountQar, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      setErrorMessage('Please enter title and amount');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          amountQar: parseFloat(amount),
          paymentSource,
          receiptNumber,
          vendorName,
          notes,
          userId: user?.id,
          userName: user?.fullName || 'Cashier',
          storeId: store?.id || 'STORE-MAIN',
          shiftId: shift?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to record expense');

      setIsNewModalOpen(false);
      setTitle('');
      setAmount('');
      setReceiptNumber('');
      setVendorName('');
      setNotes('');
      fetchExpenses();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errorMsg || 'Error recording expense');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<ExpenseItem>[] = [
    {
      key: 'expenseDate',
      header: 'Date & Time',
      className: 'w-40 font-mono text-[11px] text-stone-500 whitespace-nowrap',
      render: (exp) => (
        <span className="truncate block">
          {formatQatarDateTime(exp.expenseDate)}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Description',
      className: 'min-w-[160px] font-medium text-stone-900 whitespace-nowrap',
      render: (exp) => (
        <div className="truncate">
          <span className="text-xs font-medium text-stone-900 truncate block">{exp.title}</span>
          {exp.notes && (
            <span className="text-[10px] text-stone-400 font-mono truncate block">{exp.notes}</span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: 'w-32 whitespace-nowrap',
      render: (exp) => (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200 truncate">
          {exp.category.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'paymentSource',
      header: 'Source',
      className: 'w-32 whitespace-nowrap',
      render: (exp) => (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200 truncate">
          {exp.paymentSource.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'vendorName',
      header: 'Paid To',
      priority: 'standard',
      className: 'w-32 text-stone-600 whitespace-nowrap',
      render: (exp) => <span className="truncate block text-xs">{exp.vendorName || '—'}</span>,
    },
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      priority: 'wide',
      className: 'w-28 font-mono text-stone-500 whitespace-nowrap',
      render: (exp) => <span className="truncate block text-xs">{exp.receiptNumber || '—'}</span>,
    },
    {
      key: 'amountQar',
      header: 'Amount',
      className: 'w-32 text-right whitespace-nowrap',
      render: (exp) => (
        <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums truncate block">
          -{formatQar(exp.amountQar)}
        </span>
      ),
    },
  ];

  return (
    <Shell
      title="Store Expenses & Petty Cash (OPEX)"
      subtitle="Track daily operating expenses, maintenance and cash drawer payouts"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 gap-3 sm:gap-4 overflow-hidden bg-stone-100/60">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
          <KpiCard
            label="Total Recorded Expenses"
            value={formatQar(totalExpense)}
            sublabel="Store operating expenditures"
            tone="rose"
            icon={<Wallet size={15} />}
            className="col-span-2 sm:col-span-1"
          />
          <KpiCard
            label="Expense Vouchers Logged"
            value={`${expenses.length} Records`}
            sublabel="All verified vouchers"
            tone="teal"
            icon={<Receipt size={15} />}
          />
          <KpiCard
            label="Cash Drawer Payouts"
            value={formatQar(
              expenses
                .filter((e) => e.paymentSource === 'CASH_DRAWER')
                .reduce((sum, e) => sum + e.amountQar, 0)
            )}
            sublabel="Shift register deductions"
            icon={<Banknote size={15} />}
          />
        </div>

        {/* Header with Category Filter, Search and Record Action */}
        <PageHeader
          title="Expense Vouchers"
          subtitle={`${expenses.length} Total`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by description, vendor, receipt #..."
          filters={CATEGORY_FILTERS}
          activeFilter={selectedCategory}
          onFilterChange={setSelectedCategory}
          primaryAction={{
            label: 'Record Expense',
            icon: Plus,
            onClick: () => {
              setErrorMessage('');
              setIsNewModalOpen(true);
            },
          }}
        />

        {/* Expenses Table with universal pagination and mobile card view */}
        <div className="flex-1 min-h-0 bg-white border border-stone-200 rounded-lg flex flex-col overflow-hidden">
          <DataTable
            data={expenses}
            columns={columns}
            keyExtractor={(exp) => exp.id}
            loading={loading}
            searchQuery={search}
            searchFields={[
              (exp) => exp.title,
              (exp) => exp.vendorName,
              (exp) => exp.receiptNumber,
              (exp) => exp.category,
            ]}
            filterFn={(exp) => {
              if (selectedCategory === 'ALL') return true;
              return exp.category === selectedCategory;
            }}
            pageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyTitle="No expenses found"
            emptyDescription={loading ? 'Loading expenses...' : 'No expense records found matching criteria.'}
            renderCard={(exp) => (
              <>
                <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                  <span className="font-medium text-xs text-stone-900 truncate">
                    {exp.title}
                  </span>
                  <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums shrink-0">
                    -{formatQar(exp.amountQar)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] min-w-0 text-stone-600">
                  <span className="truncate">{exp.vendorName || exp.category.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[10px] text-stone-400 shrink-0">{exp.paymentSource.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-stone-400 min-w-0">
                  <span className="truncate">{exp.receiptNumber ? `#${exp.receiptNumber}` : '—'}</span>
                  <span className="shrink-0">{formatQatarDateTime(exp.expenseDate)}</span>
                </div>
              </>
            )}
          />
        </div>
      </div>

      {/* New Expense Modal */}
      <ResponsiveDialog
        open={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        maxWidthClass="sm:max-w-md"
        icon={<Wallet size={16} className="text-teal-700" />}
        title="Record Store Expense (OPEX)"
        subtitle="Petty Cash & Operational Disbursement"
        bodyClassName="p-4 sm:p-5"
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-stone-700 font-medium mb-1">
              Expense Title / Purpose
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tea & Pantry Supplies"
              className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[16px] sm:text-xs focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-stone-700 font-medium mb-1">
                Amount (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono text-[16px] sm:text-xs focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-medium mb-1">Payment Source</label>
              <SearchableSelect
                value={paymentSource}
                onChange={setPaymentSource}
                options={PAYMENT_SOURCE_OPTIONS}
                placeholder="Select payment source..."
                searchPlaceholder="Search source..."
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-medium mb-1">Category</label>
            <SearchableSelect
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
              placeholder="Select category..."
              searchPlaceholder="Search category..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-stone-700 font-medium mb-1">Vendor / Paid To</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor Name"
                className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[16px] sm:text-xs focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-medium mb-1">Receipt #</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Receipt #"
                className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono text-[16px] sm:text-xs focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-medium mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional remarks"
              className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[16px] sm:text-xs focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="min-h-[42px] px-4 rounded-lg border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] px-4 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save Expense</span>
            </button>
          </div>
        </form>
      </ResponsiveDialog>
    </Shell>
  );
}
