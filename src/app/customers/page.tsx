'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { CustomerItem } from '@/lib/types';
import { formatQar } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { UserPlus, Check, Loader2, AlertCircle, Users, Wallet, Award, Phone, Mail } from 'lucide-react';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import { KpiCard } from '@/components/ui/kpi-card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SlideOverDrawer } from '@/components/ui/slide-over-drawer';

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
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

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
    let active = true;
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.customers) setCustomers(data.customers);
      })
      .catch((err) => {
        console.error('Error loading customers:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error saving customer');
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
      priority: 'wide',
      render: (c) => (
        <span className="text-stone-500 text-[11px] truncate block">
          {c.email || '—'}
        </span>
      ),
    },
    {
      key: 'tag',
      header: 'Tag',
      priority: 'standard',
      render: (c) => (
        <span
          className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border ${
            c.tag === 'VIP'
              ? 'bg-teal-50 text-teal-800 border-teal-200 font-semibold'
              : 'bg-stone-100 text-stone-600 border-stone-200'
          }`}
        >
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
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
          <KpiCard
            label="Registered Clients"
            value={customers.length}
            icon={<Users size={15} />}
          />
          <KpiCard
            label="VIP Members"
            value={vipCount}
            tone="teal"
            icon={<Award size={15} />}
          />
          <KpiCard
            label="Store Credit Held"
            value={formatQar(totalCredit)}
            tone="emerald"
            icon={<Wallet size={15} />}
            className="col-span-2 sm:col-span-1"
          />
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
          loading={loading}
          onRowClick={(c) => setSelectedCustomer(c)}
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
                <span
                  className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                    c.tag === 'VIP'
                      ? 'bg-teal-50 text-teal-800 border-teal-200 font-semibold'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
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

      {/* Client Profile Detail Slide-Over Drawer */}
      <SlideOverDrawer
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        widthClass="sm:w-[420px]"
        title={selectedCustomer?.fullName || 'Customer Profile'}
        subtitle={selectedCustomer ? `ID: ${selectedCustomer.id}` : undefined}
        badge={
          selectedCustomer && (
            <span
              className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                selectedCustomer.tag === 'VIP'
                  ? 'bg-teal-50 text-teal-800 border-teal-200 font-semibold'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              {selectedCustomer.tag || 'REGULAR'}
            </span>
          )
        }
        footer={
          selectedCustomer && (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="min-h-[42px] px-4 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-medium hover:bg-stone-100 cursor-pointer transition"
              >
                Close
              </button>
            </div>
          )
        }
      >
        {selectedCustomer && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 block">
                  Available Store Credit
                </span>
                <span className="font-mono text-xl font-bold text-teal-900 tabular-nums mt-0.5 block">
                  {formatQar(selectedCustomer.storeCreditQar || 0)}
                </span>
              </div>
              <Wallet size={20} className="text-teal-700" />
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
                  <Phone size={12} /> Mobile
                </span>
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="font-mono font-medium text-teal-800 hover:underline"
                >
                  {selectedCustomer.phone}
                </a>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
                  <Mail size={12} /> Email
                </span>
                <span className="text-stone-800 truncate">{selectedCustomer.email || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Add New Customer Modal */}
      <ResponsiveDialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidthClass="sm:max-w-sm"
        icon={<UserPlus size={16} className="text-teal-700" />}
        title="Add Customer Profile"
        subtitle="Client Directory & Store Credit"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
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
              className="w-full text-[16px] sm:text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono focus:bg-white focus:border-teal-600 focus:outline-none"
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
              className="w-full text-[16px] sm:text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-teal-600 focus:outline-none"
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
              className="w-full text-[16px] sm:text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
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
                className="w-full text-[16px] sm:text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-mono focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {formError && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center gap-1.5">
              <AlertCircle size={13} className="text-rose-600 shrink-0" />
              <span className="truncate">{formError}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="min-h-[42px] px-4 rounded-lg border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="min-h-[42px] px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {creating ? <Loader2 size={13} className="animate-spin text-teal-200" /> : <Check size={13} />}
              <span>Save Client</span>
            </button>
          </div>
        </form>
      </ResponsiveDialog>
    </Shell>
  );
}
