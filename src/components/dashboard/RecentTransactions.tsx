'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Receipt, ArrowUpRight } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: any[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  return (
    <Card
      title="Recent POS Transactions"
      subtitle="Latest customer settlements"
      action={
        <Link
          href="/billing"
          className="text-xs font-semibold text-[#7C3AED] hover:underline flex items-center gap-0.5"
        >
          <span>View All</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      }
      noPadding
    >
      <div className="divide-y divide-stone-100 max-h-[380px] overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            No transactions recorded yet
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-4 hover:bg-stone-50/60 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center border border-purple-100">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 leading-tight">
                    {tx.invoice?.customer?.name || 'Walk-in Guest'}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
                    <span className="font-mono text-stone-600">
                      {tx.invoice?.invoiceNumber}
                    </span>
                    <span>•</span>
                    <span>{formatDate(tx.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-stone-900 block">
                  {formatCurrency(tx.amount)}
                </span>
                <Badge
                  variant={
                    tx.method === 'UPI'
                      ? 'purple'
                      : tx.method === 'Cash'
                      ? 'success'
                      : 'info'
                  }
                  size="sm"
                  className="mt-0.5"
                >
                  {tx.method}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
