'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { CustomerItem } from '@/lib/types';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { User, Phone, Mail, Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { AnimatedQar } from '@/components/shared/animated-number';

export function CustomerModal() {
  const { isCustomerModalOpen, setCustomerModalOpen, setCustomer, showToast } = usePosStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isCustomerModalOpen) return;

    let ignore = false;
    async function searchCustomers() {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (!ignore && data.customers) {
          setResults(data.customers);
        }
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    const timer = setTimeout(searchCustomers, searchQuery ? 200 : 0);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isCustomerModalOpen]);

  const handleSelect = (cust: CustomerItem) => {
    setCustomer({
      id: cust.id,
      name: cust.fullName || 'Customer',
      phone: cust.phone,
      email: cust.email || '',
      storeCreditQar: cust.storeCreditQar || 0,
    });
    showToast('Customer Selected', `${cust.fullName || cust.phone} attached`, true);
    setCustomerModalOpen(false);
  };

  const handleSelectWalkIn = () => {
    setCustomer({
      id: null,
      name: 'Walk-in Customer',
      phone: '',
      email: '',
    });
    setCustomerModalOpen(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      setFormError('Phone number is required');
      return;
    }

    setSavingNew(true);
    setFormError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newPhone.trim(),
          fullName: newName.trim() || 'Customer',
          email: newEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save customer');

      handleSelect(data.customer);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error saving customer');
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <ResponsiveDialog
      open={isCustomerModalOpen}
      onClose={() => setCustomerModalOpen(false)}
      title="Customer Directory (F2)"
      icon={<User size={15} className="text-teal-700" />}
      maxWidthClass="sm:max-w-lg"
    >
      {/* Tab switcher */}
      <div className="flex border-b border-stone-200 bg-stone-50 text-xs shrink-0">
        <button
          type="button"
          onClick={() => setIsAddingNew(false)}
          className={`flex-1 min-h-[40px] py-2 text-center transition cursor-pointer ${
            !isAddingNew
              ? 'border-b-2 border-teal-700 text-stone-900 font-semibold bg-white'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Search Directory
        </button>
        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className={`flex-1 min-h-[40px] py-2 text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
            isAddingNew
              ? 'border-b-2 border-teal-700 text-stone-900 font-semibold bg-white'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserPlus size={13} />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-4">
        {!isAddingNew ? (
          <div className="space-y-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name or phone (+974...)"
                className="w-full h-10 sm:h-9 pl-9 pr-3 bg-stone-50 border border-stone-200 rounded-xl text-[16px] sm:text-xs font-normal focus:bg-white focus:outline-hidden focus:border-teal-700 transition"
              />
            </div>

            <button
              type="button"
              onClick={handleSelectWalkIn}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-dashed border-stone-300 hover:border-teal-700 hover:bg-stone-50 text-left flex items-center justify-between text-xs transition cursor-pointer"
            >
              <div className="truncate min-w-0">
                <span className="font-semibold text-stone-800 block truncate leading-tight">
                  Walk-in Client (Default)
                </span>
                <span className="text-[10px] text-stone-400 font-mono truncate block leading-tight">
                  Direct counter sale
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 shrink-0">
                Select
              </span>
            </button>

            <div className="space-y-1.5 max-h-[42dvh] overflow-y-auto">
              {loading ? (
                <div className="py-8 flex justify-center text-stone-400">
                  <Loader2 size={16} className="animate-spin text-teal-700" />
                </div>
              ) : results.length === 0 ? (
                <div className="py-6 text-center text-stone-400 text-xs">
                  No matching customer records found.
                </div>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-stone-200 hover:border-teal-700 hover:bg-teal-50/30 text-left flex items-center justify-between gap-2 transition cursor-pointer group min-w-0"
                  >
                    <div className="truncate min-w-0">
                      <div className="font-semibold text-xs text-stone-900 truncate">
                        {c.fullName || 'Customer'}
                      </div>
                      <div className="text-[10px] text-stone-500 flex items-center gap-2 mt-0.5 font-mono truncate">
                        <span className="flex items-center gap-1">
                          <Phone size={9} /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail size={9} /> {c.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.storeCreditQar && c.storeCreditQar > 0 ? (
                      <span className="text-[10px] font-mono font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                        <span>Credit:</span>
                        <AnimatedQar value={c.storeCreditQar} />
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-stone-400 group-hover:text-teal-700 shrink-0">
                        Select
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Mobile Phone Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                required
                autoFocus
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+974 5512 3456"
                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-[16px] sm:text-xs font-mono focus:bg-white focus:outline-hidden focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Customer Full Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Fatima Al-Kuwari"
                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-[16px] sm:text-xs focus:bg-white focus:outline-hidden focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.qa"
                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-[16px] sm:text-xs focus:bg-white focus:outline-hidden focus:border-teal-700"
              />
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {formError}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="min-h-[42px] px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNew}
                className="min-h-[42px] px-5 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                {savingNew ? (
                  <Loader2 size={13} className="animate-spin text-teal-100" />
                ) : (
                  <Check size={13} />
                )}
                <span>Save Client</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </ResponsiveDialog>
  );
}
