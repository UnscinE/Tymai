'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/lib/cn';
import { formatAmount } from '@/shared/lib/currency';
import { fadeUp, staggerList } from '@/shared/components/motion/variants';
import type { Bill, SplitResult } from '@/features/bill-split/types';
import { useSlipVerification } from '../hooks/use-slip-verification';
import { SlipDropzone } from './SlipDropzone';
import { VerificationStatus } from './VerificationStatus';

export function PaymentChecklist({
  bill,
  split,
  isOwner,
  ownerToken,
  restrictToPersonId,
  onBillUpdate,
  onSelectPerson,
  selectedPersonId,
}: {
  bill: Bill;
  split: SplitResult;
  isOwner: boolean;
  ownerToken?: string | null;
  /** ถ้ากำหนด = โหมดเพื่อน: อัปโหลดสลิปได้เฉพาะของตัวเอง */
  restrictToPersonId?: string | null;
  onBillUpdate: (bill: Bill) => void;
  onSelectPerson?: (personId: string) => void;
  selectedPersonId?: string | null;
}) {
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [manualBusyId, setManualBusyId] = useState<string | null>(null);

  const handleBillUpdate = useCallback((next: Bill) => onBillUpdate(next), [onBillUpdate]);
  const { state, verify, reset } = useSlipVerification(bill.id, { onBillUpdate: handleBillUpdate });

  const handleUpload = (personId: string, file: File) => {
    setActivePersonId(personId);
    void verify(personId, file);
  };

  const handleManualToggle = async (personId: string, nextStatus: 'paid' | 'unpaid') => {
    if (!ownerToken) return;
    setManualBusyId(personId);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-owner-token': ownerToken },
        body: JSON.stringify({ personId, status: nextStatus }),
      });
      const json = await res.json();
      if (res.ok && json.bill) onBillUpdate(json.bill as Bill);
    } finally {
      setManualBusyId(null);
    }
  };

  return (
    <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-2">
      <AnimatePresence mode="popLayout">
        {split.shares.map((share) => {
          const record = bill.payments[share.personId];
          const isPaid = record?.status === 'paid';
          const canUpload = !isPaid && (!restrictToPersonId || restrictToPersonId === share.personId);
          const showStatus = activePersonId === share.personId;

          return (
            <motion.li
              key={share.personId}
              layout
              variants={fadeUp}
              exit="exit"
              className={cn(
                'rounded-xl border p-3 transition-colors',
                isPaid ? 'border-success/30 bg-success-soft/60' : 'border-line bg-white',
                selectedPersonId === share.personId && !isPaid && 'ring-4 ring-brand/10',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!onSelectPerson}
                  onClick={() => onSelectPerson?.(share.personId)}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
                  <p className="truncate text-sm font-semibold text-ink">{share.name}</p>
                  <p className="text-xs text-ink-faint">
                    {isPaid && record?.paidAt
                      ? `จ่ายเมื่อ ${formatTime(record.paidAt)}${record.manual ? ' (ยืนยันด้วยมือ)' : ''}`
                      : `ยอด ${formatAmount(share.total)} บาท`}
                  </p>
                </button>

                <span className="flex shrink-0 items-center gap-2">
                  <motion.span layout>
                    {isPaid ? <Badge tone="success">จ่ายแล้ว</Badge> : <Badge tone="warning">ยังไม่จ่าย</Badge>}
                  </motion.span>
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {formatAmount(share.total)}
                  </span>
                </span>
              </div>

              {share.total > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  {canUpload && (
                    <SlipDropzone
                      disabled={showStatus && ['reading', 'scanning', 'verifying'].includes(state.stage)}
                      onFile={(file) => handleUpload(share.personId, file)}
                    />
                  )}
                  {isOwner && (
                    <Button
                      size="sm"
                      variant={isPaid ? 'ghost' : 'secondary'}
                      disabled={manualBusyId === share.personId}
                      onClick={() => handleManualToggle(share.personId, isPaid ? 'unpaid' : 'paid')}
                      className="shrink-0"
                    >
                      {isPaid ? 'ยกเลิก' : 'ติ๊กเอง'}
                    </Button>
                  )}
                </div>
              )}

              {showStatus && (
                <VerificationStatus stage={state.stage} message={state.message} onDismiss={reset} />
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </motion.ul>
  );
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
