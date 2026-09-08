import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink',
        'placeholder:text-ink-faint',
        'transition-colors duration-150',
        'focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10',
        'disabled:bg-surface-alt disabled:text-ink-faint',
        className,
      )}
      {...props}
    />
  );
}
