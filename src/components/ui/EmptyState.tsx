import React from 'react';
import { cn } from '@/lib/utils';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3.5 border border-stone-200/60">
        {icon || <PackageOpen className="w-6 h-6 stroke-[1.5]" />}
      </div>
      <h3 className="text-sm font-semibold text-stone-800 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-stone-500 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
