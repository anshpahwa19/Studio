import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  title,
  subtitle,
  action,
  footer,
  noPadding = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden transition-all duration-200',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-6')}>{children}</div>
      {footer && (
        <div className="px-6 py-3.5 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};
