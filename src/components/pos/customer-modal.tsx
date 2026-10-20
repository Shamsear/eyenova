'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/stores/pos-store';
import { CustomerItem } from '@/lib/types';
import { X, User, Phone, Mail, Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { formatQar } from '@/lib/utils';
import { motion } from 'motion/react';
import { AnimatedQar } from '@/components/shared/animated-number';

export function CustomerModal() {
  const { isCustomerModalOpen, setCustomerModalOpen, setCustomer, showToast } = usePosStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New customer form
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

  if (!isCustomerModalOpen) return null;

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
    } catch (err: any) {
      setFormError(err.message || 'Error saving customer');
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-t-xl sm:rounded-xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] shadow-xl"
      >
        {/* Header (Swiss Light Style) */}
        <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <User size={14} className="text-stone-500 shrink-0" />
            <h2 className="font-medium text-xs text-stone-900 truncate">Customer Directory (F2)</h2>
          </div>
          <button
            onClick={() => setCustomerModalOpen(false)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 bg-stone-50 text-xs shrink-0">
          <button
            onClick={() => setIsAddingNew(false)}
            className={`flex-1 py-2 text-center transition cursor-pointer ${
              !isAddingNew
                ? 'border-b-2 border-stone-900 text-stone-900 font-medium bg-white'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Search Directory
          </button>
          <button
            onClick={() => setIsAddingNew(true)}
            className={`flex-1 py-2 text-center transition flex items-center justify-center gap-1 cursor-pointer ${
              isAddingNew
                ? 'border-b-2 border-stone-900 text-stone-900 font-medium bg-white'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus size={12} />
            <span>Add New</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 flex-1 overflow-y-auto">
          {!isAddingNew ? (
            <div className="space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type name or phone (+974...)"
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs font-normal focus:bg-white focus:outline-hidden focus:border-stone-400 transition"
                />
              </div>

              {/* Default Walk-in Button (Single Line) */}
              <button
                onClick={handleSelectWalkIn}
                className="w-full px-2.5 py-2 rounded-md border border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 text-left flex items-center justify-between text-xs transition cursor-pointer"
              >
                <div className="truncate min-w-0">
                  <span className="font-medium text-stone-800 block truncate leading-tight">Walk-in Client (Default)</span>
                  <span className="text-[10px] text-stone-400 font-mono truncate block leading-tight">Direct counter sale</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 shrink-0">Select</span>
              </button>

              {/* Results List */}
              <div className="space-y-1">
                {loading ? (
                  <div className="py-8 flex justify-center text-stone-400">
                    <Loader2 size={16} className="animate-spin text-stone-600" />
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-6 text-center text-stone-400 text-xs">
                    No matching customer records found.
                  </div>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="w-full px-2.5 py-2 rounded-md border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-left flex items-center justify-between gap-2 transition cursor-pointer group min-w-0"
                    >
                      <div className="truncate min-w-0">
                        <div className="font-medium text-xs text-stone-900 truncate">
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
                        <span className="text-[10px] font-mono font-medium text-emerald-700 bg-stone-100 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1">
                          <span>Credit:</span>
                          <AnimatedQar value={c.storeCreditQar} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-stone-400 group-hover:text-stone-900 shrink-0">Select</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateCustomer} className="space-y-2.5">
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
                  className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs font-mono focus:bg-white focus:outline-hidden focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Fatima Al-Kuwari"
                  className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:bg-white focus:outline-hidden focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.qa"
                  className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:bg-white focus:outline-hidden focus:border-stone-400"
                />
              </div>

              {formError && (
                <div className="p-1.5 bg-stone-50 border border-stone-300 rounded text-xs text-stone-900">
                  {formError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 rounded-md border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-3 py-1.5 rounded-md bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1 cursor-pointer"
                >
                  {savingNew ? <Loader2 size={12} className="animate-spin text-stone-400" /> : <Check size={12} />}
                  <span>Save Client</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
