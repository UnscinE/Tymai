'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/shared/lib/cn';
import type { SlipStage } from '../types';

const BUSY: SlipStage[] = ['reading', 'scanning', 'verifying'];

/**
 * แถบสถานะการยืนยันสลิป
 *
 * สำคัญ: ห้าม key element ด้วย `stage` แล้วให้ AnimatePresence สลับ
 * เพราะสถานะเปลี่ยนเร็วมาก (reading -> scanning -> verifying -> success ภายในไม่กี่วินาที)
 * จน element เก่ายังออกไม่เสร็จ ตัวใหม่ก็เข้ามาแล้ว สุดท้ายค้างซ้อนกันหลายอัน
 * จึงใช้ element เดียวตลอด แล้วเปลี่ยนแค่ "เนื้อหาข้างใน" กับสีตามสถานะแทน
 */
export function VerificationStatus({
  stage,
  message,
  onDismiss,
}: {
  stage: SlipStage;
  message: string | null;
  onDismiss?: () => void;
}) {
  const visible = stage !== 'idle' && message !== null;
  const busy = BUSY.includes(stage);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="slip-status"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="overflow-hidden"
        >
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs transition-colors duration-200',
              busy && 'border-brand/25 bg-brand-soft text-brand-dark',
              stage === 'success' && 'border-success/25 bg-success-soft text-success-ink',
              stage === 'failed' && 'border-danger/25 bg-danger-soft text-danger-ink',
            )}
          >
            <span className="mt-px w-3 shrink-0 text-center">
              {busy ? (
                <motion.span
                  className="block h-3 w-3 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                />
              ) : stage === 'success' ? (
                '✓'
              ) : (
                '!'
              )}
            </span>
            <p className="flex-1">{message}</p>
            {stage === 'failed' && onDismiss && (
              <button type="button" onClick={onDismiss} className="shrink-0 underline underline-offset-2">
                ลองใหม่
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
