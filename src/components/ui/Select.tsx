'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Option[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options = [],
      placeholder,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full px-3.5 py-2 pr-10 text-sm text-stone-900 bg-white border rounded-lg appearance-none transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              'disabled:bg-stone-50 disabled:text-stone-500 disabled:cursor-not-allowed',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-stone-200 hover:border-stone-300',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
          <div className="absolute right-3 pointer-events-none text-stone-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
