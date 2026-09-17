import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-alt text-ink-muted border-line',
  success: 'bg-success-soft text-success-ink border-success/25',
  warning: 'bg-warning-soft text-warning-ink border-warning/30',
  danger: 'bg-danger-soft text-danger-ink border-danger/25',
  brand: 'bg-brand-soft text-brand-dark border-brand/20',
};

export function Badge({ className, tone = 'neutral', ...props }: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
