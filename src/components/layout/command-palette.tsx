'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Lock, Maximize2 } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { allNavItems } from '@/lib/navigation';

interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  icon: React.ElementType;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isAdmin,
    lockStation,
    toggleFullscreen,
    isFullscreen,
  } = useSessionStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const userIsAdmin = isAdmin();

  const actions = useMemo<CommandAction[]>(() => {
    const routeActions: CommandAction[] = allNavItems
      .filter((item) => !item.adminOnly || userIsAdmin)
      .map((item) => ({
        id: `route:${item.href}`,
        label: item.title,
        hint: item.keywords?.slice(0, 3).join(' · '),
        shortcut: item.shortcut,
        icon: item.icon,
        run: () => {
          setCommandPaletteOpen(false);
          router.push(item.href);
        },
      }));

    const stationActions: CommandAction[] = [
      {
        id: 'action:lock',
        label: 'Lock Register Station',
        hint: 'Switch cashier or require PIN',
        icon: Lock,
        run: () => {
          setCommandPaletteOpen(false);
          lockStation();
        },
      },
      {
        id: 'action:fullscreen',
        label: isFullscreen ? 'Exit Fullscreen Mode' : 'Enter Fullscreen Mode',
        hint: 'Toggle browser kiosk fullscreen',
        shortcut: 'F11',
        icon: Maximize2,
        run: () => {
          setCommandPaletteOpen(false);
          toggleFullscreen();
        },
      },
    ];

    return [...routeActions, ...stationActions];
  }, [userIsAdmin, router, setCommandPaletteOpen, lockStation, toggleFullscreen, isFullscreen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.hint && a.hint.toLowerCase().includes(q)) ||
        (a.shortcut && a.shortcut.toLowerCase().includes(q))
    );
  }, [actions, query]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onEsc);
    };
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const safeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && filtered[safeIndex]) {
      e.preventDefault();
      filtered[safeIndex].run();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/45 backdrop-blur-xs flex items-end sm:items-start justify-center p-0 sm:p-4 sm:pt-16"
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation command palette"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80dvh]"
      >
        <div className="p-3 border-b border-stone-200 bg-stone-50/70 flex items-center gap-2 shrink-0">
          <Search size={15} className="text-teal-700 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to module, report, or action..."
            className="flex-1 bg-transparent text-[16px] sm:text-xs text-stone-900 placeholder:text-stone-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              aria-label="Clear filter"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            className="px-2 py-1 rounded border border-stone-200 bg-white text-[10px] font-mono text-stone-500 cursor-pointer"
          >
            Esc
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-1.5 divide-y divide-stone-100 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs font-mono text-stone-400">
              No modules match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 text-stone-900'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={15}
                      className={isSelected ? 'text-teal-700 shrink-0' : 'text-stone-400 shrink-0'}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{item.label}</div>
                      {item.hint && (
                        <div className="text-[10px] text-stone-400 truncate">{item.hint}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.shortcut && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-600">
                        {item.shortcut}
                      </span>
                    )}
                    {isSelected && <ArrowRight size={13} className="text-teal-700" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
