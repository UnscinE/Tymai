'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Users } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatAmount, splitEvenly } from '@/shared/lib/currency';
import type { BillItem, Person } from '../types';

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
  const [isExpanded, setIsExpanded] = useState(false);

  const eaterCount = item.sharedBy.length;
  const perHead = eaterCount > 0 ? splitEvenly(item.price, eaterCount)[0] : 0;
  const allSelected = eaterCount === people.length && people.length > 0;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.9, height: 0 }}
      animate={{ opacity: 1, scale: 1, height: 'auto' }}
      exit={{ opacity: 0, scale: 0.9, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:shadow-sm',
        eaterCount === 0 ? 'border-warning/40 bg-warning-soft' : 'border-line bg-white hover:border-brand/40',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="font-semibold text-ink">{item.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 rounded-full bg-surface-alt px-2 py-1 text-xs text-ink-muted hover:bg-surface-hover"
            >
              <Users className="h-3 w-3" />
              {eaterCount === 0 ? (
                <span>ไม่มีคนกิน</span>
              ) : (
                <span>{eaterCount} คน</span>
              )}
            </button>
            <p className="text-xs text-ink-faint">
              {eaterCount > 0 && `(คนละ ~${formatAmount(perHead)})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-lg font-bold tabular-nums text-ink">{formatAmount(item.price)}</p>
          <button
            type="button"
            aria-label={`ลบ ${item.name}`}
            onClick={() => onRemove(item.id)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-danger/10 hover:text-danger-ink"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {people.map((person) => {
                  const active = item.sharedBy.includes(person.id);
                  return (
                    <motion.button
                      key={person.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggleEater(item.id, person.id)}
                      layout
                      initial={{ opacity: 0, scale: 0.9, height: 0 }}
                      animate={{ opacity: 1, scale: 1, height: 'auto' }}
                      exit={{ opacity: 0, scale: 0.9, height: 0 }}
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95',
                        active
                          ? 'border-brand/30 bg-brand-soft text-brand-dark'
                          : 'border-line bg-white text-ink-faint hover:border-ink-faint hover:text-ink-muted',
                      )}
                    >
                      {person.name}
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {people.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectAll(item.id, allSelected ? [] : people.map((p) => p.id))}
                  className="ml-2 text-xs text-brand underline-offset-2 hover:underline"
                >
                  {allSelected ? 'ล้างทุกคน' : 'เลือกทุกคน'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
