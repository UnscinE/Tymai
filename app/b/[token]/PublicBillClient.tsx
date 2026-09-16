'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

import {
  calculateSplit, PaymentChecklist, PaymentQRCard, summarizePayments,
  useSharedBill, type Bill, useSlipVerification, SlipDropzone, VerificationStatus
} from '@/features';
import { Badge, Card, CardBody, CardHeader, cn, fadeUp, formatAmount, useLocalStorage } from '@/shared';
import { Button } from '@/shared/components/ui/Button';

/**
 * หน้าที่เพื่อนเปิดจากลิงก์ — ไม่ต้องมีบัญชี
 * สิทธิ์มาจากการถือโทเคนของบิล (เดาไม่ได้) เหมือนลิงก์แชร์ของ Google Docs
 */
export function PublicBillClient({ token, initialBill }: { token: string; initialBill: Bill }) {
  const { bill, setBill, status } = useSharedBill(`/api/public/bills/${token}`, initialBill);

  // จำว่าเพื่อนคนนี้คือใครในบิล เก็บในเครื่องเขาเอง ไม่ได้ส่งขึ้น server
  const { value: myPersonId, setValue: setMyPersonId, hydrated } = useLocalStorage<string | null>(
    `tymai.bill-identity.${initialBill.id}`,
    null,
  );

  const slipEndpoint = `/api/public/bills/${token}/slips`;
  const { state: slipState, verify, reset: resetSlip } = useSlipVerification(slipEndpoint, { onBillUpdate: setBill });

  const current = bill ?? initialBill;
  const split = useMemo(() => calculateSplit(current), [current]);
  const payments = summarizePayments(current, split);

  const share = myPersonId ? split.byPersonId[myPersonId] : undefined;
  const isPaid = myPersonId ? current.payments[myPersonId]?.status === 'paid' : false;

  if (status === 'not-found') {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <p className="text-center text-sm text-ink-muted">บิลนี้หมดอายุหรือถูกลบไปแล้ว</p>
      </main>
    );
  }

  const handleUpload = (file: File) => {
    if (myPersonId) {
      void verify(myPersonId, file);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      {!myPersonId ? (
        <div className="space-y-5">
          <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6 text-center">
            <p className="text-xs font-medium tracking-[0.18em] text-ink-faint">หารค่าอาหาร</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{current.title}</h1>
            <p className="mt-2 text-sm text-ink-muted">
              รวม {formatAmount(split.grandTotal)} บาท · จ่ายแล้ว {payments.paidCount}/
              {payments.totalCount} คน
            </p>
            {payments.isSettled && (
              <div className="mt-3 flex justify-center">
                <Badge tone="success">เก็บเงินครบแล้ว</Badge>
              </div>
            )}
          </motion.header>
          
          <Card>
            <CardHeader title="คุณคือใครในบิลนี้" description="เลือกชื่อตัวเองเพื่อดูยอดและ QR ของคุณ" />
            <CardBody>
              <PaymentChecklist
                bill={current}
                split={split}
                isOwner={false}
                slipEndpoint={slipEndpoint}
                restrictToPersonId="__none__"
                onBillUpdate={setBill}
                onSelectPerson={(id) => setMyPersonId(id)}
              />
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-medium text-ink-muted">
              Paying as: <strong className="text-ink">{share?.name}</strong>
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setMyPersonId(null)}>
              Change Person
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {share && share.total > 0 && (
              <motion.div
                key={share.personId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                <Card>
                  <CardHeader
                    title={isPaid ? 'คุณจ่ายเรียบร้อยแล้ว' : `ยอดของ ${share.name}`}
                    description={
                      isPaid
                        ? 'ขอบคุณครับ ระบบยืนยันสลิปของคุณแล้ว'
                        : 'สแกน QR นี้เพื่อจ่าย แล้วอัปโหลดสลิปยืนยันด้านล่าง'
                    }
                    action={isPaid ? <Badge tone="success">จ่ายแล้ว</Badge> : undefined}
                  />
                  <CardBody className="space-y-6">
                    {!isPaid && (
                      <div className="flex flex-col items-center gap-6">
                        <PaymentQRCard
                          source={{ kind: 'public', token, personId: share.personId }}
                          amountSatang={share.total}
                          payerName={share.name}
                          billTitle={current.title}
                          fallbackAccountName={current.accountName}
                        />
                        <div className="w-full max-w-sm space-y-2">
                          <SlipDropzone
                            disabled={['reading', 'scanning', 'verifying'].includes(slipState.stage)}
                            onFile={handleUpload}
                          />
                          <VerificationStatus 
                            stage={slipState.stage} 
                            message={slipState.message} 
                            onDismiss={resetSlip} 
                          />
                        </div>
                      </div>
                    )}

                    <ul className="space-y-1 rounded-xl bg-surface-alt p-3 text-xs text-ink-muted">
                      {share.lines.map((line) => (
                        <li key={line.itemId} className="flex justify-between gap-3">
                          <span className="truncate">{line.itemName}</span>
                          <span className="tabular-nums">{formatAmount(line.amount)}</span>
                        </li>
                      ))}
                      {share.service > 0 && (
                        <li className="flex justify-between gap-3">
                          <span>ค่าบริการ</span>
                          <span className="tabular-nums">{formatAmount(share.service)}</span>
                        </li>
                      )}
                      {share.vat > 0 && (
                        <li className="flex justify-between gap-3">
                          <span>VAT</span>
                          <span className="tabular-nums">{formatAmount(share.vat)}</span>
                        </li>
                      )}
                      {share.discount > 0 && (
                        <li className="flex justify-between gap-3 text-success-ink">
                          <span>ส่วนลด</span>
                          <span className="tabular-nums">-{formatAmount(share.discount)}</span>
                        </li>
                      )}
                      <li className="flex justify-between gap-3 border-t border-line pt-1 font-semibold text-ink">
                        <span>รวม</span>
                        <span className="tabular-nums">{formatAmount(share.total)}</span>
                      </li>
                    </ul>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card>
            <CardHeader
              title="สถานะคนอื่นๆ"
              description="ดูยอดคนอื่นในบิลนี้"
            />
            <CardBody>
              <PaymentChecklist
                bill={current}
                split={split}
                isOwner={false}
                slipEndpoint={slipEndpoint}
                restrictToPersonId="__none__"
                onBillUpdate={setBill}
              />
            </CardBody>
          </Card>

          <p className="pb-6 text-center text-xs text-ink-faint">
            ระบบอ่าน QR บนสลิปในเครื่องคุณเอง รูปสลิปไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์
          </p>
        </div>
      )}
    </main>
  );
}
