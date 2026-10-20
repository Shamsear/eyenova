'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { CustomerItem } from '@/lib/types';
import { formatQar } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { UserPlus, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';

const TAG_FILTERS = [
  { id: 'ALL', label: 'All Clients' },
  { id: 'VIP', label: 'VIP Clients' },
  { id: 'REGULAR', label: 'Regular' },
];

const CUSTOMER_TAG_OPTIONS: SelectOption[] = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'VIP', label: 'VIP' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tag, setTag] = useState('VIP');
  const [credit, setCredit] = useState('0');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setFormError('Phone number is required');
      return;
    }

    setCreating(true);
    setFormError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim() || 'Customer',
          phone: phone.trim(),
          email: email.trim() || null,
          tag,
          storeCreditQar: parseFloat(credit) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create customer');

      setIsModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setCredit('0');
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Error saving customer');
    } finally {
      setCreating(false);
    }
  };

  const totalCredit = customers.reduce((sum, c) => sum + (c.storeCreditQar || 0), 0);
  const vipCount = customers.filter((c) => c.tag === 'VIP').length;

  const columns: Column<CustomerItem>[] = [
    {
      key: 'fullName',
      header: 'Customer Name',
      render: (c) => (
        <span className="font-medium text-stone-900 truncate block">
          {c.fullName || 'Customer'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (c) => (
        <span className="font-mono text-stone-700 text-xs truncate block">
          {c.phone}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email Address',
      render: (c) => (
        <span className="text-stone-500 text-[11px] truncate block">
          {c.email || '—'}
        </span>
      ),
    },
    {
      key: 'tag',
      header: 'Tag',
      render: (c) => (
        <span className="font-mono text-[10px] text-stone-600 uppercase px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
          {c.tag || 'REGULAR'}
        </span>
      ),
    },
    {
      key: 'storeCreditQar',
      header: 'Store Credit',
      align: 'right',
      render: (c) => (
        <span className="font-mono font-medium text-stone-900 tabular-nums truncate block">
          {formatQar(c.storeCreditQar || 0)}
        </span>
      ),
    },
  ];

  return (
    <Shell
      title="Customers Directory"
      subtitle="Client Profiles & Store Credit"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden">
        {/* KPI Strip (Strictly Single-Line) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Registered Clients</span>
            <span className="font-mono font-medium text-base text-stone-900 tabular-nums">{customers.length}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Store Credit Held</span>
            <span className="font-mono font-medium text-base text-emerald-700 tabular-nums">{formatQar(totalCredit)}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">VIP Members</span>
            <span className="font-mono font-medium text-base text-stone-900 tabular-nums">{vipCount}</span>
          </div>
        </div>

        {/* Page Header (Single-Line) */}
        <PageHeader
          title="Clients Registry"
          subtitle={`${customers.length} Profiles`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by phone, name, email..."
          filters={TAG_FILTERS}
          activeFilter={selectedTag}
          onFilterChange={setSelectedTag}
          primaryAction={{
            label: 'Add Customer',
            onClick: () => setIsModalOpen(true),
            icon: UserPlus,
          }}
        />

        {/* Universal DataTable with Global Pre-Filtered Pagination & Mobile Cards */}
        <DataTable
          data={customers}
          columns={columns}
          keyExtractor={(c) => c.id}
          searchQuery={search}
          searchFields={[
            (c) => c.fullName || '',
            (c) => c.phone,
            (c) => c.email || '',
          ]}
          filterFn={(c) => {
            if (selectedTag === 'ALL') return true;
            return c.tag === selectedTag;
          }}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          renderCard={(c) => (
            <>
              {/* Tier 1: Customer Name and Tag (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                <span className="font-medium text-xs text-stone-900 truncate">
                  {c.fullName || 'Customer'}
                </span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                  {c.tag || 'REGULAR'}
                </span>
              </div>

              {/* Tier 2: Phone and Email (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-stone-500 min-w-0">
                <span className="truncate">{c.phone}</span>
                <span className="truncate text-[10px]">{c.email || '—'}</span>
              </div>

              {/* Tier 3: Store Credit (Strictly Single-Line) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 text-xs">
                <span className="text-[10px] font-mono text-stone-400">Store Credit:</span>
                <span className="font-mono font-medium text-stone-900 tabular-nums">
                  {formatQar(c.storeCreditQar || 0)}
                </span>
              </div>
            </>
          )}
        />
      </div>

      {/* Add New Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-stone-200 w-full max-w-sm overflow-hidden p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-stone-900">Add Customer Profile</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Mobile Phone Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+974 5512 3456"
                  className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md font-mono focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Fatima Al-Kuwari"
                  className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.qa"
                  className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                    Tag
                  </label>
                  <SearchableSelect
                    value={tag}
                    onChange={setTag}
                    options={CUSTOMER_TAG_OPTIONS}
                    placeholder="Select tag..."
                    searchPlaceholder="Search tag..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                    Credit (QAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-md font-mono focus:bg-white"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-1.5 bg-stone-50 border border-stone-300 rounded text-xs text-stone-900 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-rose-600 shrink-0" />
                  <span className="truncate">{formError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-2.5 py-1.5 rounded-md border border-stone-200 text-stone-700 text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  {creating ? <Loader2 size={12} className="animate-spin text-stone-400" /> : <Check size={12} />}
                  <span>Save Client</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
