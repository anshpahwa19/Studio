'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  emptyMessage?: string;
  clearable?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder = '-- Select an option --',
  searchPlaceholder = 'Type to search...',
  options = [],
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  className,
  emptyMessage = 'No matching options found',
  clearable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected Option
  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  );

  // Filtered Options based on Search Query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label?.toLowerCase().includes(q);
      const matchSublabel = opt.sublabel?.toLowerCase().includes(q);
      const matchBadge = opt.badge?.toLowerCase().includes(q);
      return matchLabel || matchSublabel || matchBadge;
    });
  }, [options, searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Field Label */}
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 select-none shadow-sm',
          isOpen
            ? 'ring-2 ring-primary-500/20 border-primary-500'
            : 'border-stone-200 hover:border-stone-300',
          disabled && 'bg-stone-50 text-stone-400 cursor-not-allowed border-stone-200',
          error && 'border-rose-400 focus:border-rose-500 ring-rose-500/20'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 text-left">
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && (
                <span className="shrink-0 text-stone-400">{selectedOption.icon}</span>
              )}
              <span className="font-semibold text-stone-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-xs text-stone-500 shrink-0">
                  {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-stone-400 truncate">{placeholder}</span>
          )}
        </div>

        {/* Right Icons: Clear & Chevron */}
        <div className="flex items-center gap-1.5 shrink-0 text-stone-400">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isOpen && 'rotate-180 text-primary-600'
            )}
          />
        </div>
      </div>

      {/* Floating Searchable Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[70] bg-white rounded-xl shadow-2xl border border-stone-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-stone-100 bg-stone-50/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-1.5 text-xs text-stone-900 bg-white border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-1.5">
                <Search className="w-5 h-5 text-stone-300" />
                <p className="font-medium text-stone-600">{emptyMessage}</p>
                {searchQuery && (
                  <p className="text-[11px] text-stone-400">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(String(opt.value))}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-all duration-100 group',
                      isSelected
                        ? 'bg-purple-50 text-[#7C3AED] font-semibold border border-purple-200/80 shadow-xs'
                        : 'hover:bg-stone-100/80 text-stone-800',
                      opt.disabled && 'opacity-40 cursor-not-allowed bg-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1">
                      {opt.icon && (
                        <span className="shrink-0 text-stone-400 group-hover:text-primary-600 transition-colors">
                          {opt.icon}
                        </span>
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate font-medium">{opt.label}</span>
                        {opt.sublabel && (
                          <span
                            className={cn(
                              'text-[11px] truncate',
                              isSelected ? 'text-purple-600/80' : 'text-stone-500'
                            )}
                          >
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                            isSelected
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          )}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-[#7C3AED]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Helper & Error text */}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-stone-500">{helperText}</p>
      )}
    </div>
  );
};
