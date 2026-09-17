'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/shared/lib/cn';
import { formatAmount } from '@/shared/lib/currency';
import { fadeUp, staggerList } from '@/shared/components/motion/variants';
import { Badge } from '@/shared/components/ui/Badge';
import type { SplitResult } from '../types';

export function BillSummary({
  split,
  selectedPersonId,
  paidPersonIds,
  onSelectPerson,
}: {
  split: SplitResult;
  selectedPersonId: string | null;
  paidPersonIds?: Set<string>;
  onSelectPerson: (personId: string) => void;
}) {
  if (split.shares.length === 0) {
    return <p className="text-sm text-ink-faint">เพิ่มสมาชิกและรายการอาหารเพื่อดูยอดของแต่ละคน</p>;
  }

  return (
    <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-2">
      <AnimatePresence mode="popLayout">
        {split.shares.map((share) => {
          const isPaid = paidPersonIds?.has(share.personId) ?? false;
          const isSelected = selectedPersonId === share.personId;
          return (
            <motion.li
              key={share.personId}
              layout
              initial={{ opacity: 0, scale: 0.9, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.9, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
              className="overflow-hidden"
            >
              <motion.button
                type="button"
                onClick={() => onSelectPerson(share.personId)}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition',
                  'hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  isSelected ? 'border-brand bg-brand-soft/50 ring-4 ring-brand/10' : 'border-line bg-white',
                  isPaid && 'border-success/30 bg-success-soft/50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{share.name}</span>
                  <span className="flex items-center gap-2">
                    {isPaid && <Badge tone="success">จ่ายแล้ว</Badge>}
                    <span className="text-base font-bold tabular-nums text-ink">
                      {formatAmount(share.total)}
                    </span>
                  </span>
                </div>

                {share.lines.length > 0 ? (
                  <p className="mt-1 truncate text-xs text-ink-faint">
                    {share.lines.map((l) => l.itemName).join(' · ')}
                    {share.service + share.vat > 0 && ' · ค่าบริการ/VAT'}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-ink-faint">ยังไม่ได้ถูกจับคู่กับเมนูไหน</p>
                )}
              </motion.button>
            </motion.li>
          );
        })}
      </AnimatePresence>

      {split.unassignedItems.length > 0 && (
        <motion.li layout variants={fadeUp}>
          <p className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs text-warning-ink">
            มี {split.unassignedItems.length} รายการ (
            {formatAmount(split.unassignedAmount)} บาท) ที่ยังไม่ได้เลือกคนกิน — ยอดนี้ยังไม่ถูกหารให้ใคร
          </p>
        </motion.li>
      )}
    </motion.ul>
  );
}
