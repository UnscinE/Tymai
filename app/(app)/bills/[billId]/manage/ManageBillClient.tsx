'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  calculateSplit, LogoPicker, PaymentChecklist, PaymentQRCard, ShareLinkPanel,
  summarizePayments, useQrLogo, useSharedBill, type Bill,
} from '@/features';
import { Badge, Card, CardBody, CardHeader, fadeUp, formatAmount } from '@/shared';

/** หน้าเก็บเงินของเจ้าของบิล — เห็น checklist ทุกคน ติ๊กสถานะเองได้ และคัดลอกลิงก์แชร์ */
export function ManageBillClient({ initialBill }: { initialBill: Bill }) {
  const { bill, setBill } = useSharedBill(`/api/bills/${initialBill.id}`, initialBill);
  const logo = useQrLogo();
  const [pickedPersonId, setPickedPersonId] = useState<string | null>(null);

  const current = bill ?? initialBill;
  const split = useMemo(() => calculateSplit(current), [current]);
  const payments = summarizePayments(current, split);

  const selectedPersonId =
    pickedPersonId && split.byPersonId[pickedPersonId]
      ? pickedPersonId
      : (split.shares.find((s) => current.payments[s.personId]?.status !== 'paid')?.personId ??
        split.shares[0]?.personId ??
        null);

  const selectedShare = selectedPersonId ? split.byPersonId[selectedPersonId] : undefined;
  const logoSrc = logo.logo.kind === 'none' ? undefined : logo.logo.src;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{current.title}</h1>
          {payments.isSettled ? (
            <Badge tone="success">เก็บครบแล้ว</Badge>
          ) : (
            <Badge tone="brand">กำลังเก็บเงิน</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          จ่ายแล้ว {payments.paidCount}/{payments.totalCount} คน · ค้างอยู่{' '}
          {formatAmount(payments.outstanding)} บาท จากทั้งบิล {formatAmount(split.grandTotal)} บาท
        </p>
        <Link
          href="/dashboard"
          className="mt-2 inline-block text-xs text-ink-faint underline-offset-2 hover:text-brand hover:underline"
        >
          ← กลับหน้าหลัก
        </Link>
      </motion.header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="สถานะการจ่ายเงิน"
              description="กดชื่อเพื่อดู QR ของคนนั้น · ติ๊กเองได้ถ้าเพื่อนจ่ายเงินสด"
            />
            <CardBody>
              <PaymentChecklist
                bill={current}
                split={split}
                isOwner
                slipEndpoint={`/api/bills/${current.id}/slips`}
                onBillUpdate={setBill}
                onSelectPerson={setPickedPersonId}
                selectedPersonId={selectedPersonId}
              />
            </CardBody>
          </Card>

          {current.publicToken && (
            <Card>
              <CardHeader title="แชร์ให้เพื่อน" description="เพื่อนอัปโหลดสลิปเองได้จากลิงก์นี้" />
              <CardBody>
                <ShareLinkPanel publicToken={current.publicToken} />
              </CardBody>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader title="PromptPay QR" description="ส่งให้เพื่อนสแกนจ่ายได้ทันที" />
            <CardBody className="space-y-4">
              <LogoPicker
                logo={logo.logo}
                presets={logo.presets}
                error={logo.error}
                onSelectPreset={logo.selectPreset}
                onUpload={logo.uploadLogo}
                onClear={logo.clearLogo}
              />
              <div className="flex justify-center pt-1">
                {selectedShare && selectedShare.total > 0 ? (
                  <PaymentQRCard
                    key={`${selectedShare.personId}-${selectedShare.total}`}
                    source={{ kind: 'bill', billId: current.id, personId: selectedShare.personId }}
                    amountSatang={selectedShare.total}
                    payerName={selectedShare.name}
                    billTitle={current.title}
                    logoSrc={logoSrc}
                    fallbackAccountName={current.accountName}
                  />
                ) : (
                  <p className="py-12 text-center text-sm text-ink-faint">
                    เลือกคนที่มียอดค้างชำระ
                    <br />
                    เพื่อสร้าง QR ของคนนั้น
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}
