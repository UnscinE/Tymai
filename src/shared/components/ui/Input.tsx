import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink shadow-sm',
        'placeholder:text-ink-faint',
        'transition-[border-color,box-shadow,background-color] duration-150',
        'focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10',
        'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-faint',
        className,
      )}
      {...props}
    />
  );
}
