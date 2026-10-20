'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { Building, Printer, Check, Save, Loader2, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState({
    nameEn: '',
    nameAr: '',
    email: '',
    phone: '',
    addressEn: '',
    addressAr: '',
    crNumber: '',
    vatNumber: '',
    currency: 'QAR',
    taxRate: '0.00',
  });

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.profile) {
        setCompany({
          nameEn: data.profile.nameEn || '',
          nameAr: data.profile.nameAr || '',
          email: data.profile.email || '',
          phone: data.profile.phone || '',
          addressEn: data.profile.addressEn || '',
          addressAr: data.profile.addressAr || '',
          crNumber: data.profile.crNumber || '',
          vatNumber: data.profile.vatNumber || '',
          currency: data.profile.currency || 'QAR',
          taxRate: data.profile.taxRate?.toString() || '0.00',
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      title="System Settings & Store Profile"
      subtitle="Legal registration, tax configuration and hardware peripheral settings"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 gap-3 sm:gap-4 overflow-y-auto bg-stone-100/60">
        {/* Sticky Action Header (Always visible without scrolling) */}
        <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-xs font-semibold text-stone-900 uppercase tracking-wider truncate">
              Store Configuration
            </span>
            {saved && (
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                <Check size={12} />
                <span>Saved successfully</span>
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0 justify-start sm:justify-end min-w-0">
            <button
              type="button"
              onClick={loadSettings}
              disabled={loading || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition border border-stone-200 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Settings Form Container */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Company Legal Profile */}
          <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Building size={14} className="text-stone-500 shrink-0" />
                <h3 className="font-semibold text-xs text-stone-900 truncate">
                  Company Legal Registration & Receipt Header
                </h3>
              </div>
              <span className="text-[10px] font-mono font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                MOCI Registered
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-stone-700 font-medium mb-1 truncate">Company Name (English)</label>
                <input
                  type="text"
                  value={company.nameEn}
                  onChange={(e) => setCompany({ ...company, nameEn: e.target.value })}
                  placeholder="EyeNova Optical"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1 truncate">Company Name (Arabic)</label>
                <input
                  type="text"
                  value={company.nameAr}
                  onChange={(e) => setCompany({ ...company, nameAr: e.target.value })}
                  placeholder="آي نوفا للتجارة البصرية"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs text-stone-900 text-right focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1 truncate">Qatar CR Number</label>
                <input
                  type="text"
                  value={company.crNumber}
                  onChange={(e) => setCompany({ ...company, crNumber: e.target.value })}
                  placeholder="e.g. 182940"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1 truncate">VAT / Tax Identification</label>
                <input
                  type="text"
                  value={company.vatNumber}
                  onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
                  placeholder="Optional / Exempt"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-stone-700 font-medium mb-1 truncate">Store Address (English)</label>
                <input
                  type="text"
                  value={company.addressEn}
                  onChange={(e) => setCompany({ ...company, addressEn: e.target.value })}
                  placeholder="02 Mall, 79 Street 773, Al Kheesa, Doha, Qatar"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1 truncate">Official Phone</label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  placeholder="+974 6633 7371"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1 truncate">Official Email</label>
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  placeholder="info@eyenova.qa"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>
            </div>
          </div>

          {/* POS Hardware & Protocols Configuration */}
          <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Printer size={14} className="text-stone-500 shrink-0" />
                <h3 className="font-semibold text-xs text-stone-900 truncate">
                  POS Hardware & Thermal Roll Configuration
                </h3>
              </div>
              <span className="text-[10px] font-mono font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                Hardware
              </span>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 border border-stone-200 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-stone-900 block truncate">Thermal Receipt Roll Format</span>
                  <span className="text-[11px] text-stone-500 block truncate font-mono">
                    ESC/POS 80mm continuous thermal paper (264px viewport)
                  </span>
                </div>
                <span className="bg-stone-100 text-stone-800 border border-stone-200 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                  80mm Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 border border-stone-200 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-stone-900 block truncate">A4 Tax Invoice PDF Generation</span>
                  <span className="text-[11px] text-stone-500 block truncate font-mono">
                    Vector jsPDF generation with bilingual QR code & CR/VAT details
                  </span>
                </div>
                <span className="bg-stone-100 text-stone-800 border border-stone-200 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                  PDF Enabled
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 border border-stone-200 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-stone-900 block truncate">ECR Bank Card Terminal Mode</span>
                  <span className="text-[11px] text-stone-500 block truncate font-mono">
                    One-click terminal confirmation with auth code (QNB, CBQ, Doha Bank, PAX)
                  </span>
                </div>
                <span className="bg-stone-900 text-stone-50 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                  1-Click Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-stone-50 border border-stone-200 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-stone-900 block truncate">Optical Diopter & Cart Architecture</span>
                  <span className="text-[11px] text-stone-500 block truncate font-mono">
                    Direct 1-line item cart without OD/OS eye separation
                  </span>
                </div>
                <span className="bg-stone-100 text-stone-800 border border-stone-200 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                  Direct Line Active
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Shell>
  );
}
