'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Receipt,
  UserRound,
} from 'lucide-react';
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
  const { value: myPersonId, setValue: setMyPersonId } = useLocalStorage<string | null>(
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

  const isVerifying = ['reading', 'scanning', 'verifying'].includes(slipState.stage);
  const isConfirmed = isPaid || slipState.stage === 'success';

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-2xl px-4 py-8 md:py-12"
    >
      {!myPersonId ? (
        <motion.div layout className="space-y-5">
          <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/80 text-brand shadow-sm">
              <Receipt size={24} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="text-xs font-medium tracking-[0.18em] text-ink-faint">หารค่าอาหาร</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{current.title}</h1>
            <p className="mt-2 text-sm text-ink-muted tabular-nums">
              รวม {formatAmount(split.grandTotal)} บาท · จ่ายแล้ว {payments.paidCount}/
              {payments.totalCount} คน
            </p>
            {payments.isSettled && (
              <div className="mt-3 flex justify-center">
                <Badge tone="success">เก็บเงินครบแล้ว</Badge>
              </div>
            )}
          </motion.header>

          <Card className="border border-white/70 bg-white/85 shadow-lifted backdrop-blur-sm">
            <CardHeader
              title="คุณคือใครในบิลนี้"
              description="เลือกชื่อตัวเองเพื่อดูยอดและ QR ของคุณ"
              action={<UserRound size={20} className="text-brand" aria-hidden="true" />}
            />
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
        </motion.div>
      ) : (
        <motion.div layout className="space-y-5">
          <motion.div layout className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-medium text-ink-muted">
              Paying as: <strong className="text-ink">{share?.name}</strong>
            </h2>
            <Button
              variant="secondary"
              size="sm"
              className="active:scale-95"
              onClick={() => setMyPersonId(null)}
              disabled={isVerifying}
            >
              Change Person
            </Button>
          </motion.div>

          <AnimatePresence mode="wait">
            {share && share.total > 0 && (
              <motion.div
                key={share.personId}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                <motion.div
                  layout
                  animate={
                    isConfirmed
                      ? { scale: [1, 1.05, 1] }
                      : slipState.stage === 'failed'
                        ? { x: [0, -6, 6, -4, 4, 0] }
                        : { scale: 1 }
                  }
                  transition={
                    isConfirmed
                      ? { duration: 0.45, ease: 'easeOut' }
                      : { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }
                  }
                >
                  <Card
                    className={cn(
                      'border border-white/70 bg-white/90 shadow-lifted backdrop-blur-sm',
                      isConfirmed && 'border-success/40 bg-success-soft/70',
                    )}
                  >
                    <CardHeader
                      title={isConfirmed ? 'Payment Confirmed' : `ยอดของ ${share.name}`}
                      description={
                        isConfirmed
                          ? 'ระบบยืนยันการชำระเงินของคุณเรียบร้อยแล้ว'
                          : 'สแกน QR นี้เพื่อจ่าย แล้วอัปโหลดสลิปยืนยันด้านล่าง'
                      }
                      action={
                        isConfirmed ? (
                          <Badge tone="success">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 size={14} aria-hidden="true" /> จ่ายแล้ว
                            </span>
                          </Badge>
                        ) : undefined
                      }
                    />
                    <CardBody className="space-y-6">
                      {isConfirmed ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.86 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                          className="flex flex-col items-center gap-3 rounded-2xl border border-success/20 bg-white/70 px-5 py-8 text-center"
                        >
                          <CheckCircle2 size={56} strokeWidth={1.6} className="text-success" aria-hidden="true" />
                          <p className="text-lg font-semibold text-success-ink">ชำระเงินสำเร็จ</p>
                          <p className="text-sm text-ink-muted">ยอด {formatAmount(share.total)} บาทได้รับการยืนยันแล้ว</p>
                        </motion.div>
                      ) : (
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
                              disabled={isVerifying}
                              onFile={handleUpload}
                            />
                            {isVerifying && (
                              <div
                                role="status"
                                aria-live="polite"
                                className="flex items-center justify-center gap-2 rounded-xl border border-brand/20 bg-brand-soft px-3 py-3 text-sm font-medium text-brand-dark"
                              >
                                <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                                Checking your slip...
                              </div>
                            )}
                            <VerificationStatus
                              stage={slipState.stage}
                              message={slipState.message}
                              onDismiss={resetSlip}
                            />
                            {slipState.stage === 'failed' && (
                              <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-3 text-sm text-danger-ink">
                                <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <p>{slipState.message ?? 'ตรวจสอบสลิปไม่สำเร็จ กรุณาลองอัปโหลดใหม่'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <motion.ul layout className="space-y-1 rounded-xl border border-white/70 bg-surface-alt/80 p-3 text-xs text-ink-muted shadow-sm">
                        <AnimatePresence initial={false} mode="popLayout">
                          {share.lines.map((line) => (
                            <motion.li
                              key={line.itemId}
                              layout
                              initial={{ opacity: 0, scale: 0.9, height: 0 }}
                              animate={{ opacity: 1, scale: 1, height: 'auto' }}
                              exit={{ opacity: 0, scale: 0.9, height: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                              className="flex justify-between gap-3 overflow-hidden"
                            >
                              <span className="truncate">{line.itemName}</span>
                              <span className="tabular-nums">{formatAmount(line.amount)}</span>
                            </motion.li>
                          ))}
                        </AnimatePresence>
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
                          <span className="text-lg tabular-nums">{formatAmount(share.total)}</span>
                        </li>
                      </motion.ul>
                    </CardBody>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="border border-white/70 bg-white/85 shadow-card backdrop-blur-sm">
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
        </motion.div>
      )}
    </motion.main>
  );
}
