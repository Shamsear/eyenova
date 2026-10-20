'use client';

import React, { useState, useMemo, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subtext?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'stone' | 'rose' | 'blue';
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  compact?: boolean;
  className?: string;
  buttonClassName?: string;
  menuWidth?: string | number;
  id?: string;
  name?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  allowClear = false,
  compact = false,
  className = '',
  buttonClassName = '',
  menuWidth,
  id,
  name,
  renderOption,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Selected Option resolution
  const selectedOption = options.find((o: SelectOption) => o.value === value);

  // Filtered Options
  const filteredOptions: SelectOption[] = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o: SelectOption) => {
      const matchLabel = o.label.toLowerCase().includes(q);
      const matchVal = o.value.toLowerCase().includes(q);
      const matchSub = o.subtext ? o.subtext.toLowerCase().includes(q) : false;
      const matchBadge = o.badge ? o.badge.toLowerCase().includes(q) : false;
      return matchLabel || matchVal || matchSub || matchBadge;
    });
  }, [options, search]);

  // Update dropdown coordinates relative to viewport
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(280, Math.max(100, filteredOptions.length * 36 + 48));
    const placeAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    setCoords({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      placeAbove,
    });
  }, [filteredOptions.length]);

  // Open dropdown
  const handleOpen = () => {
    if (disabled) return;
    updateCoords();
    setSearch('');
    // Highlight currently selected option or the first enabled option
    const idx = filteredOptions.findIndex((o: SelectOption) => o.value === value && !o.disabled);
    setHighlightedIndex(idx >= 0 ? idx : (filteredOptions.findIndex((o: SelectOption) => !o.disabled) ?? 0));
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  };

  // Recalculate position on scroll or resize when open
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateCoords]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Reset highlighted index when search query filters change
  useEffect(() => {
    if (isOpen) {
      const firstEnabled = filteredOptions.findIndex((o: SelectOption) => !o.disabled);
      setHighlightedIndex(firstEnabled >= 0 ? firstEnabled : 0);
    }
  }, [search, filteredOptions, isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const itemEl = listRef.current.children[highlightedIndex] as HTMLElement;
    if (itemEl && typeof itemEl.scrollIntoView === 'function') {
      itemEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.parentElement?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation on search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        for (let i = prev + 1; i < filteredOptions.length; i++) {
          if (!filteredOptions[i].disabled) return i;
        }
        return prev;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        for (let i = prev - 1; i >= 0; i--) {
          if (!filteredOptions[i].disabled) return i;
        }
        return prev;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetOption = filteredOptions[highlightedIndex];
      if (targetOption && !targetOption.disabled) {
        onChange(targetOption.value);
        handleClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  // Keyboard navigation on trigger button
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  const badgeColorClasses = (color?: SelectOption['badgeColor']) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'blue':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className={`relative inline-block w-full text-left ${className}`}>
      {/* Hidden input for form submission compatibility */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full flex items-center justify-between text-left transition select-none outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 ${
          compact
            ? 'px-1.5 py-0.5 text-[11px] font-mono rounded bg-transparent border-0 text-stone-800'
            : 'px-2.5 py-1.5 text-xs rounded border border-stone-300 bg-white text-stone-900 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-100' : 'cursor-pointer hover:border-stone-400'} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate flex-1 pr-1 flex items-center gap-1.5 min-w-0">
          {selectedOption ? (
            <>
              <span className="truncate font-medium">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded border uppercase shrink-0 ${badgeColorClasses(
                    selectedOption.badgeColor
                  )}`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-stone-400 truncate">{placeholder}</span>
          )}
        </span>

        <span className="shrink-0 flex items-center gap-0.5 text-stone-400">
          {allowClear && selectedOption && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-stone-700 transition cursor-pointer"
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown size={compact ? 11 : 13} className={`transition-transform duration-150 ${isOpen ? 'rotate-180 text-stone-700' : ''}`} />
        </span>
      </button>

      {/* Floating Menu Portal */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              width: menuWidth ? (typeof menuWidth === 'number' ? `${menuWidth}px` : menuWidth) : `${Math.max(coords.width, 180)}px`,
              zIndex: 99999,
            }}
            className="bg-white border border-stone-300 rounded-lg shadow-xl overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Search Input Filter */}
            <div className="p-1.5 border-b border-stone-200 bg-stone-50/80 flex items-center gap-1.5 shrink-0">
              <Search size={12} className="text-stone-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs text-stone-900 placeholder:text-stone-400 outline-none pr-1"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              className="max-h-56 overflow-y-auto divide-y divide-stone-100 p-0.5"
            >
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-stone-400 font-mono">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt: SelectOption, idx: number) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled}
                      onClick={() => {
                        if (opt.disabled) return;
                        onChange(opt.value);
                        handleClose();
                      }}
                      onMouseEnter={() => {
                        if (!opt.disabled) setHighlightedIndex(idx);
                      }}
                      className={`px-2.5 py-1.5 flex items-center justify-between gap-2 transition rounded select-none ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed bg-stone-50/50'
                          : 'cursor-pointer'
                      } ${
                        isHighlighted && !opt.disabled
                          ? 'bg-stone-100 text-stone-900 font-medium'
                          : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {renderOption ? (
                        renderOption(opt)
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate block">{opt.label}</span>
                            {opt.badge && (
                              <span
                                className={`text-[9px] font-mono px-1 py-0.2 rounded border uppercase shrink-0 ${badgeColorClasses(
                                  opt.badgeColor
                                )}`}
                              >
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.subtext && (
                            <span className="text-[10px] text-stone-400 font-mono block truncate">
                              {opt.subtext}
                            </span>
                          )}
                        </div>
                      )}

                      {isSelected && (
                        <Check size={12} className="text-stone-900 shrink-0 ml-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
