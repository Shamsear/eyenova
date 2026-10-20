'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSessionStore } from '@/stores/session-store';
import {
  Store,
  KeyRound,
  Delete,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { SearchableSelect } from '@/components/shared/searchable-select';

interface UserOption {
  id: string;
  username: string;
  fullName: string;
  role: string;
  roleBadge: string;
  initials: string;
  storeId: string | null;
  storeName: string;
}

interface StoreOption {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

export function LoginOverlay() {
  const { login } = useSessionStore();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch users & stores
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        const defaultUser =
          data.users.find((u: UserOption) => u.username === 'staff') || data.users[0];
        setSelectedUser(defaultUser);
      }
      if (data.stores && data.stores.length > 0) {
        setStores(data.stores);
        setSelectedStore(data.stores[0]);
      }
    } catch (err) {
      console.error('Failed to load login users:', err);
      setErrorMessage('Could not connect to database. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle PIN input
  const handleDigit = (digit: string) => {
    if (pinInput.length < 8) {
      setPinInput((prev) => prev + digit);
      setErrorMessage('');
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMessage('');
  };

  // Submit Login
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) {
      setErrorMessage('Please select an operator profile.');
      return;
    }
    if (!pinInput) {
      setErrorMessage('Please enter your security PIN.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          pinCode: pinInput,
          storeId: selectedStore?.id || 'STORE-MAIN',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        login(data.user, data.store || selectedStore!);
      } else {
        setErrorMessage(data.error || 'Authentication failed. Please check your PIN.');
        setPinInput('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Network connection error during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target.id !== 'pin-input-field') return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleLoginSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-100/95 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col md:flex-row shadow-lg my-auto max-h-[96dvh] md:max-h-none overflow-y-auto md:overflow-visible">
        {/* Mobile Header Banner (< md) */}
        <div className="md:hidden bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 p-1 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="EyeNova Optics"
                width={18}
                height={18}
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-xs tracking-tight text-stone-900 truncate">EyeNova Optics</h2>
              <p className="text-[10px] text-stone-500 font-mono truncate">{selectedStore?.name || 'Retail Register'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Online</span>
          </div>
        </div>

        {/* Desktop Sidebar (>= md) */}
        <div className="hidden md:flex md:w-64 bg-stone-50 p-5 flex-col justify-between border-r border-stone-200 shrink-0">
          <div className="space-y-5">
            {/* Brand Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 p-1 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="EyeNova Optics"
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium text-xs tracking-tight text-stone-900 truncate">EyeNova Optics</h2>
                <p className="text-[10px] text-stone-500 font-mono tracking-wide truncate">Retail Register</p>
              </div>
            </div>

            {/* Active Store Details */}
            <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-[10px] font-mono uppercase tracking-wider">
                <Store size={11} />
                <span className="truncate">Active Register</span>
              </div>
              <div className="font-medium text-xs text-stone-900 truncate">
                {selectedStore?.name || 'EyeNova Optical'}
              </div>
              <div className="text-[10px] text-stone-500 font-mono truncate">
                {selectedStore?.code || 'ST-01'}
              </div>
            </div>

            {/* System Status Indicators */}
            <div className="space-y-1.5 text-[11px] text-stone-600">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="truncate">Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                <span className="truncate font-mono">Terminal 01</span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-4 border-t border-stone-200/70 text-[10px] text-stone-400 font-mono flex items-center justify-between">
            <span>POS v2.6</span>
            <span>Qatar (QAR)</span>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="flex-1 p-4 sm:p-5 md:p-6 flex flex-col justify-between bg-white text-stone-900 min-w-0">
          <div>
            {/* Header with Store Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-200">
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-stone-900">Cashier Sign In</h1>
                <p className="text-[11px] text-stone-500">Select operator profile and enter PIN</p>
              </div>

              {stores.length > 0 && (
                <div className="w-full sm:w-[190px]">
                  <SearchableSelect
                    value={selectedStore?.id || ''}
                    onChange={(val) => {
                      const s = stores.find((st) => st.id === val);
                      if (s) setSelectedStore(s);
                    }}
                    options={stores.map((s) => ({
                      value: s.id,
                      label: s.name,
                      subtext: s.code,
                    }))}
                    compact
                    placeholder="Select store..."
                    searchPlaceholder="Search store..."
                  />
                </div>
              )}
            </div>

            {/* Two Column Grid: Operators & PIN */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-5 pt-3 sm:pt-4">
              {/* Operator Profiles */}
              <div className="md:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                    1. Select Profile
                  </span>
                  {selectedUser && (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Selected: {selectedUser.fullName.split(' ')[0]}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-stone-400 text-xs">
                    <Loader2 size={16} className="animate-spin text-stone-600" />
                    <span>Loading profiles...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-1.5 max-h-[140px] sm:max-h-[180px] md:max-h-[220px] overflow-y-auto pr-0.5">
                    {users.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setErrorMessage('');
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg border transition-all text-left flex items-center justify-between gap-2 min-w-0 cursor-pointer ${
                            isSelected
                              ? 'bg-stone-900 border-stone-900 text-white font-medium shadow-xs'
                              : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono shrink-0 ${
                                isSelected
                                  ? 'bg-white text-stone-900 font-bold'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {u.initials}
                            </div>
                            <span className="text-xs truncate">{u.fullName}</span>
                          </div>

                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                              isSelected
                                ? 'bg-stone-800 text-stone-200 border-stone-700'
                                : 'bg-stone-100 text-stone-600 border-stone-200/60'
                            }`}
                          >
                            {u.roleBadge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PIN Keypad */}
              <div className="md:col-span-6 space-y-2">
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                  2. Security PIN
                </span>

                {/* Masked PIN Discrete Dots */}
                <div className="relative h-10 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-center px-3">
                  {pinInput ? (
                    <div className="flex items-center gap-2">
                      {Array.from({ length: pinInput.length }).map((_, i) => (
                        <span key={i} className="inline-block w-2.5 h-2.5 rounded-full bg-stone-900 animate-in zoom-in-50 duration-100" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400 font-mono text-center truncate px-2">
                      {selectedUser ? `Enter ${selectedUser.fullName.split(' ')[0]}'s PIN` : 'Select a profile first'}
                    </span>
                  )}

                  {pinInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-2 px-1.5 py-0.5 text-[10px] font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigit(digit)}
                      className="h-10 sm:h-9 bg-stone-50 hover:bg-stone-100 active:bg-stone-200 border border-stone-200 rounded-lg text-sm sm:text-xs font-mono font-medium text-stone-900 transition cursor-pointer flex items-center justify-center touch-manipulation"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-10 sm:h-9 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono text-stone-600 transition cursor-pointer flex items-center justify-center touch-manipulation"
                  >
                    C
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDigit('0')}
                    className="h-10 sm:h-9 bg-stone-50 hover:bg-stone-100 active:bg-stone-200 border border-stone-200 rounded-lg text-sm sm:text-xs font-mono font-medium text-stone-900 transition cursor-pointer flex items-center justify-center touch-manipulation"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-10 sm:h-9 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg flex items-center justify-center text-stone-600 transition cursor-pointer touch-manipulation"
                  >
                    <Delete size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions & Error */}
          <div className="pt-3 sm:pt-4 border-t border-stone-200 space-y-2 mt-3">
            {errorMessage && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800 flex items-center gap-2">
                <AlertCircle size={13} className="shrink-0 text-rose-600" />
                <span className="truncate flex-1">{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleLoginSubmit()}
              disabled={submitting || !selectedUser || !pinInput}
              className="w-full h-11 bg-stone-900 text-stone-50 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-stone-800 active:scale-[0.99] transition disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-stone-400" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <KeyRound size={14} className="text-stone-400" />
                  <span>Unlock POS Register</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
