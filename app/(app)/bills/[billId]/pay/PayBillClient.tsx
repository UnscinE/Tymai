'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo } from 'react';

import {
  calculateSplit, LogoPicker, PaymentChecklist, PaymentQRCard, useQrLogo, useSharedBill, type Bill,
} from '@/features';
import { Badge, Card, CardBody, CardHeader, fadeUp, formatAmount } from '@/shared';

/** หน้าจ่ายเงินของคนที่ login แล้ว — เห็นเฉพาะยอดของตัวเอง อัปโหลดสลิปของตัวเองได้ */
export function PayBillClient({
  initialBill,
  participantId,
}: {
  initialBill: Bill;
  participantId: string;
}) {
  const { bill, setBill } = useSharedBill(`/api/bills/${initialBill.id}`, initialBill);
  const logo = useQrLogo();

  const current = bill ?? initialBill;
  const split = useMemo(() => calculateSplit(current), [current]);
  const share = split.byPersonId[participantId];
  const isPaid = current.payments[participantId]?.status === 'paid';
  const logoSrc = logo.logo.kind === 'none' ? undefined : logo.logo.src;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{current.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isPaid ? 'คุณจ่ายเรียบร้อยแล้ว' : `ยอดที่คุณต้องจ่าย ${formatAmount(share?.total ?? 0)} บาท`}
        </p>
        <Link
          href="/dashboard"
          className="mt-2 inline-block text-xs text-ink-faint underline-offset-2 hover:text-brand hover:underline"
        >
          ← กลับหน้าหลัก
        </Link>
      </motion.header>

      <div className="space-y-5">
        <Card>
          <CardHeader
            title={isPaid ? 'ยืนยันแล้ว' : 'สแกนจ่าย'}
            description={
              isPaid
                ? 'ระบบยืนยันสลิปของคุณเรียบร้อย'
                : 'สแกน QR แล้วอัปโหลดสลิปด้านล่างเพื่อยืนยัน'
            }
            action={isPaid ? <Badge tone="success">จ่ายแล้ว</Badge> : undefined}
          />
          <CardBody className="space-y-4">
            {!isPaid && share && share.total > 0 && (
              <>
                <div className="flex justify-center">
                  <PaymentQRCard
                    source={{ kind: 'bill', billId: current.id, personId: participantId }}
                    amountSatang={share.total}
                    payerName={share.name}
                    billTitle={current.title}
                    logoSrc={logoSrc}
                    fallbackAccountName={current.accountName}
                  />
                </div>
                <LogoPicker
                  logo={logo.logo}
                  presets={logo.presets}
                  error={logo.error}
                  onSelectPreset={logo.selectPreset}
                  onUpload={logo.uploadLogo}
                  onClear={logo.clearLogo}
                />
              </>
            )}

            {share && (
              <ul className="space-y-1 rounded-xl bg-surface-alt p-3 text-xs text-ink-muted">
                {share.lines.map((line) => (
                  <li key={line.itemId} className="flex justify-between gap-3">
                    <span className="truncate">{line.itemName}</span>
                    <span className="tabular-nums">{formatAmount(line.amount)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-3 border-t border-line pt-1 font-semibold text-ink">
                  <span>รวม</span>
                  <span className="tabular-nums">{formatAmount(share.total)}</span>
                </li>
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="สถานะทุกคน" description="อัปโหลดสลิปได้เฉพาะรายการของคุณเอง" />
          <CardBody>
            <PaymentChecklist
              bill={current}
              split={split}
              isOwner={false}
              slipEndpoint={`/api/bills/${current.id}/slips`}
              restrictToPersonId={participantId}
              onBillUpdate={setBill}
              selectedPersonId={participantId}
            />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
