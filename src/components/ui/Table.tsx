'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display at this time.',
  sortColumn,
  sortDirection,
  onSort,
  className,
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-stone-200/80 bg-white', className)}>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200/80 bg-stone-50/70">
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              return (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-600 select-none',
                    col.sortable && 'cursor-pointer hover:bg-stone-100/70 transition-colors',
                    col.className
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-stone-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-stone-700" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-stone-700" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Spinner size="md" />
                  <p className="text-xs text-stone-400">Loading data...</p>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const key = keyExtractor ? keyExtractor(item, index) : index;
              return (
                <tr
                  key={key}
                  className="hover:bg-stone-50/60 transition-colors duration-100 group"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3.5 text-stone-700', col.className)}>
                      {col.render
                        ? col.render(item, index)
                        : (item as Record<string, any>)[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
