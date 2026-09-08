'use client';

import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/cn';
import { formatAmount, splitEvenly } from '@/shared/lib/currency';
import { fadeUp } from '@/shared/components/motion/variants';
import type { BillItem, Person } from '../types';

/**
 * แถวรายการอาหาร 1 รายการ พร้อมชิปให้ติ๊กว่าใครกินบ้าง
 * ตัวอย่างที่รองรับ: เมนู 1 = a,b / เมนู 2 = a / เมนู 3 = b / เมนู 4 = a,b
 */
export function ItemRow({
  item,
  people,
  onToggleEater,
  onSelectAll,
  onRemove,
}: {
  item: BillItem;
  people: Person[];
  onToggleEater: (itemId: string, personId: string) => void;
  onSelectAll: (itemId: string, personIds: string[]) => void;
  onRemove: (itemId: string) => void;
}) {
  const eaterCount = item.sharedBy.length;
  const perHead = eaterCount > 0 ? splitEvenly(item.price, eaterCount)[0] : 0;
  const allSelected = eaterCount === people.length && people.length > 0;

  return (
    <motion.li
      layout
      variants={fadeUp}
      exit="exit"
      className={cn(
        'rounded-xl border p-3 transition-colors',
        eaterCount === 0 ? 'border-warning/40 bg-warning-soft' : 'border-line bg-white',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.name}</p>
        <p className="text-sm font-semibold tabular-nums text-ink">{formatAmount(item.price)}</p>
        <button
          type="button"
          aria-label={`ลบ ${item.name}`}
          onClick={() => onRemove(item.id)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-ink-faint transition hover:bg-danger/10 hover:text-danger-ink"
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {people.map((person) => {
          const active = item.sharedBy.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleEater(item.id, person.id)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95',
                active
                  ? 'border-brand/30 bg-brand-soft text-brand-dark'
                  : 'border-line bg-white text-ink-faint hover:border-ink-faint hover:text-ink-muted',
              )}
            >
              {person.name}
            </button>
          );
        })}

        {people.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectAll(item.id, allSelected ? [] : people.map((p) => p.id))}
            className="ml-1 text-xs text-ink-faint underline-offset-2 hover:text-brand hover:underline"
          >
            {allSelected ? 'ล้าง' : 'ทุกคน'}
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-ink-faint">
        {eaterCount === 0
          ? '⚠ ยังไม่ได้เลือกคนกิน — ยอดนี้ยังไม่ถูกนำไปหาร'
          : `หาร ${eaterCount} คน · คนละ ~${formatAmount(perHead)}`}
      </p>
    </motion.li>
  );
}
