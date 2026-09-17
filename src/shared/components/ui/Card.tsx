import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-line/90 bg-surface shadow-card',
        'transition-[border-color,box-shadow,transform] duration-200',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-line/80 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-6 tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}
