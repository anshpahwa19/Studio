import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'white' | 'stone';
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  color = 'primary',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colors = {
    primary: 'text-[#7C3AED]',
    white: 'text-white',
    stone: 'text-stone-400',
  };

  return (
    <Loader2
      className={cn('animate-spin', sizes[size], colors[color], className)}
    />
  );
};
