'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  onClear,
}) => {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm text-stone-900 bg-white border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-stone-300 transition-all duration-150"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-3 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
