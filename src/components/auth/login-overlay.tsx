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

  useEffect(() => {
    let cancelled = false;
    async function fetchUsersAndStores() {
      try {
        const res = await fetch('/api/auth/users');
        const data = await res.json();
        if (cancelled) return;
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
        if (!cancelled) {
          console.error('Failed to load login users:', err);
          setErrorMessage('Could not connect to database. Please retry.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUsersAndStores();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDigit = useCallback((digit: string) => {
    setPinInput((prev) => (prev.length < 8 ? prev + digit : prev));
    setErrorMessage('');
  }, []);

  const handleBackspace = useCallback(() => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  }, []);

  const handleClear = useCallback(() => {
    setPinInput('');
    setErrorMessage('');
  }, []);

  const handleLoginSubmit = useCallback(
    async (e?: React.FormEvent) => {
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
    },
    [selectedUser, selectedStore, pinInput, login]
  );

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
  }, [handleDigit, handleBackspace, handleClear, handleLoginSubmit]);

  return (
    <div className="fixed inset-0 z-50 bg-stone-100/95 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col md:flex-row shadow-xl my-auto max-h-[96dvh] md:max-h-none overflow-y-auto md:overflow-visible">
        {/* Mobile Header Banner (< md) */}
        <div className="md:hidden bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-700/10 border border-teal-700/20 p-1 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="EyeNova Optics"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-xs tracking-tight text-stone-900 truncate">
                EyeNova Optics
              </h2>
              <p className="text-[10px] text-stone-500 font-mono truncate">
                {selectedStore?.name || 'Retail Register'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-mono shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
            <span>Online</span>
          </div>
        </div>

        {/* Desktop Sidebar (>= md) */}
        <div className="hidden md:flex md:w-64 bg-stone-50 p-5 flex-col justify-between border-r border-stone-200 shrink-0">
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-700/10 border border-teal-700/20 p-1.5 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="EyeNova Optics"
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm tracking-tight text-stone-900 truncate">
                  EyeNova Optics
                </h2>
                <p className="text-[10px] text-teal-700 font-mono tracking-wide truncate">
                  Optical Retail Register
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-[10px] font-mono uppercase tracking-wider">
                <Store size={11} className="text-teal-700" />
                <span className="truncate">Active Branch</span>
              </div>
              <div className="font-semibold text-xs text-stone-900 truncate">
                {selectedStore?.name || 'EyeNova Optical'}
              </div>
              <div className="text-[10px] text-stone-500 font-mono truncate">
                {selectedStore?.code || 'ST-01'}
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-stone-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                <span className="truncate">Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-stone-400 shrink-0" />
                <span className="truncate font-mono">0–9 Keys + Enter Supported</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200/70 text-[10px] text-stone-400 font-mono flex items-center justify-between">
            <span>EyeNova POS</span>
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
                <p className="text-[11px] text-stone-500">
                  Select operator profile and enter security PIN
                </p>
              </div>

              {stores.length > 0 && (
                <div className="w-full sm:w-[200px]">
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
                    placeholder="Select store..."
                    searchPlaceholder="Search store..."
                  />
                </div>
              )}
            </div>

            {/* Two Column Grid: Operators & PIN */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 pt-3.5 sm:pt-4">
              {/* Operator Profiles */}
              <div className="md:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">
                    Operator Profile
                  </span>
                  {selectedUser && (
                    <span className="text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      {selectedUser.fullName.split(' ')[0]}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-stone-400 text-xs">
                    <Loader2 size={16} className="animate-spin text-teal-700" />
                    <span>Loading profiles...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-1.5 max-h-[168px] sm:max-h-[200px] md:max-h-[250px] overflow-y-auto pr-0.5">
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
                          className={`w-full min-h-[44px] px-2.5 py-2 rounded-xl border transition-all text-left flex items-center justify-between gap-2 min-w-0 cursor-pointer ${
                            isSelected
                              ? 'bg-stone-900 border-stone-900 text-white font-medium shadow-xs'
                              : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-semibold shrink-0 ${
                                isSelected
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {u.initials}
                            </div>
                            <span className="text-xs truncate">{u.fullName}</span>
                          </div>

                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                              isSelected
                                ? 'bg-stone-800 text-teal-200 border-stone-700'
                                : 'bg-stone-100 text-stone-600 border-stone-200/80'
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

              {/* Tactile PIN Keypad */}
              <div className="md:col-span-6 space-y-2">
                <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">
                  Security PIN
                </span>

                {/* Masked PIN Dots */}
                <div className="relative h-11 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center px-3">
                  {pinInput ? (
                    <div className="flex items-center gap-2.5">
                      {Array.from({ length: pinInput.length }).map((_, i) => (
                        <span
                          key={i}
                          className="inline-block w-3 h-3 rounded-full bg-teal-700 animate-in zoom-in-50 duration-100"
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400 font-mono text-center truncate px-2">
                      {selectedUser
                        ? `Enter ${selectedUser.fullName.split(' ')[0]}'s PIN`
                        : 'Select a profile first'}
                    </span>
                  )}

                  {pinInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-2 px-2 py-1 text-[10px] font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* 52px Mobile / 48px Desktop Keypad */}
                <div className="grid grid-cols-3 gap-2 sm:gap-1.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigit(digit)}
                      className="h-13 sm:h-11 bg-stone-50 hover:bg-stone-100 active:scale-[0.97] active:bg-stone-200 border border-stone-200 rounded-xl text-base sm:text-sm font-mono font-semibold text-stone-900 transition cursor-pointer flex items-center justify-center touch-manipulation"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-13 sm:h-11 bg-stone-50 hover:bg-stone-100 active:scale-[0.97] border border-stone-200 rounded-xl text-xs font-mono font-medium text-stone-600 transition cursor-pointer flex items-center justify-center touch-manipulation"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDigit('0')}
                    className="h-13 sm:h-11 bg-stone-50 hover:bg-stone-100 active:scale-[0.97] active:bg-stone-200 border border-stone-200 rounded-xl text-base sm:text-sm font-mono font-semibold text-stone-900 transition cursor-pointer flex items-center justify-center touch-manipulation"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleBackspace}
                    aria-label="Backspace"
                    className="h-13 sm:h-11 bg-stone-50 hover:bg-stone-100 active:scale-[0.97] border border-stone-200 rounded-xl flex items-center justify-center text-stone-600 transition cursor-pointer touch-manipulation"
                  >
                    <Delete size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions & Error */}
          <div className="pt-3.5 sm:pt-4 border-t border-stone-200 space-y-2.5 mt-3">
            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleLoginSubmit()}
              disabled={submitting || !selectedUser || !pinInput}
              className="w-full h-12 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin text-teal-100" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <KeyRound size={15} className="text-teal-100" />
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
