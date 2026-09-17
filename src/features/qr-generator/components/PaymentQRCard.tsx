'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { formatTHB } from '@/shared/lib/currency';
import { usePromptPayPayload, type QRSource } from '../hooks/use-promptpay-payload';
import { composePaymentCard } from '../lib/compose-card';
import { StyledQRCanvas, type QRCanvasHandle } from './StyledQRCanvas';

export function PaymentQRCard({
  source,
  amountSatang,
  payerName,
  billTitle,
  logoSrc,
  fallbackAccountName,
}: {
  /** บอก server ว่าจะสร้าง QR ของบัญชีไหน — client ไม่เคยส่งเลข PromptPay เอง */
  source: QRSource;
  /** ยอดสำหรับแสดงผลบนการ์ด (ยอดใน QR คำนวณฝั่ง server อีกที) */
  amountSatang: number;
  payerName: string;
  billTitle: string;
  logoSrc?: string;
  fallbackAccountName?: string;
}) {
  const state = usePromptPayPayload(source);
  const qrRef = useRef<QRCanvasHandle>(null);
  const [saving, setSaving] = useState(false);

  const accountName = state.status === 'ready' ? state.data.accountName : (fallbackAccountName ?? '—');

  const handleDownload = async () => {
    setSaving(true);
    try {
      const qrBlob = await qrRef.current?.toBlob();
      if (!qrBlob) return;
      const card = await composePaymentCard({
        qrBlob,
        accountName,
        payerName,
        amountSatang,
        title: billTitle,
      });
      if (!card) return;
      const url = URL.createObjectURL(card);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptpay-${payerName}-${(amountSatang / 100).toFixed(2)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
      className="w-full max-w-[336px] overflow-hidden rounded-3xl border border-line bg-white shadow-lifted"
    >
      <div className="bg-brand px-5 py-4 text-center">
        <p className="text-sm font-semibold tracking-[0.18em] text-white/90">THAI QR PAYMENT</p>
        <p className="mt-0.5 truncate text-xs text-white/65">{billTitle}</p>
      </div>

      <div className="grid place-items-center px-5 pt-6 pb-4">
        <div className="grid h-[232px] w-[232px] place-items-center rounded-2xl border border-line bg-white p-1">
          {state.status === 'ready' ? (
            <StyledQRCanvas payload={state.data.payload} logoSrc={logoSrc} handleRef={qrRef} size={224} />
          ) : state.status === 'error' ? (
            <div className="px-4 text-center">
              <p className="text-xs text-danger-ink">{state.message}</p>
              {state.reason === 'no-payee' && (
                <Link href="/settings" className="mt-1 inline-block text-xs text-brand hover:underline">
                  ไปตั้งค่าเลข PromptPay
                </Link>
              )}
            </div>
          ) : (
            <div className="h-[224px] w-[224px] animate-pulse rounded-xl bg-surface-alt" />
          )}
        </div>
      </div>

      <div className="space-y-1 px-5 pb-4 text-center">
        <p className="text-xs text-ink-faint">โอนเข้าบัญชี</p>
        <p className="truncate text-base font-semibold text-ink">{accountName}</p>
      </div>

      <div className="mx-5 border-t border-dashed border-line" />

      <div className="space-y-1 px-5 py-4 text-center">
        <p className="text-xs text-ink-faint">
          ยอดที่ <span className="font-medium text-ink-muted">{payerName}</span> ต้องชำระ
        </p>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-brand">
          {formatTHB(amountSatang)}
        </p>
      </div>

      <div className="px-5 pb-5">
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleDownload}
          disabled={state.status !== 'ready' || saving}
        >
          {saving ? 'กำลังบันทึก…' : 'บันทึกเป็นรูป'}
        </Button>
      </div>
    </motion.div>
  );
}
