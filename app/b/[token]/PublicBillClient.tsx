'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import {
  calculateSplit, LogoPicker, PaymentChecklist, PaymentQRCard, summarizePayments,
  useQrLogo, useSharedBill, type Bill,
} from '@/features';
import { Badge, Card, CardBody, CardHeader, cn, fadeUp, formatAmount, useLocalStorage } from '@/shared';

/**
 * หน้าที่เพื่อนเปิดจากลิงก์ — ไม่ต้องมีบัญชี
 * สิทธิ์มาจากการถือโทเคนของบิล (เดาไม่ได้) เหมือนลิงก์แชร์ของ Google Docs
 */
export function PublicBillClient({ token, initialBill }: { token: string; initialBill: Bill }) {
  const { bill, setBill, status } = useSharedBill(`/api/public/bills/${token}`, initialBill);
  const logo = useQrLogo();

  // จำว่าเพื่อนคนนี้คือใครในบิล เก็บในเครื่องเขาเอง ไม่ได้ส่งขึ้น server
  const { value: myPersonId, setValue: setMyPersonId, hydrated } = useLocalStorage<string | null>(
    `tymai.bill-identity.${initialBill.id}`,
    null,
  );
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null);

  const current = bill ?? initialBill;
  const split = useMemo(() => calculateSplit(current), [current]);
  const payments = summarizePayments(current, split);

  const activePersonId = previewPersonId ?? myPersonId;
  const share = activePersonId ? split.byPersonId[activePersonId] : undefined;
  const isPaid = activePersonId ? current.payments[activePersonId]?.status === 'paid' : false;
  const logoSrc = logo.logo.kind === 'none' ? undefined : logo.logo.src;

  if (status === 'not-found') {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <p className="text-center text-sm text-ink-muted">บิลนี้หมดอายุหรือถูกลบไปแล้ว</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:py-12">
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

      <div className="space-y-5">
        <Card>
          <CardHeader title="คุณคือใครในบิลนี้" description="เลือกชื่อตัวเองเพื่อดูยอดและ QR ของคุณ" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {split.shares.map((s) => {
                const selected = activePersonId === s.personId;
                const paid = current.payments[s.personId]?.status === 'paid';
                return (
                  <button
                    key={s.personId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setMyPersonId(s.personId);
                      setPreviewPersonId(null);
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95',
                      selected
                        ? 'border-brand bg-brand text-white'
                        : paid
                          ? 'border-success/30 bg-success-soft text-success-ink'
                          : 'border-line bg-white text-ink-muted hover:border-brand/40 hover:text-brand',
                    )}
                  >
                    {s.name}
                    <span className="ml-1.5 text-xs tabular-nums opacity-75">
                      {formatAmount(s.total)}
                    </span>
                  </button>
                );
              })}
            </div>
            {hydrated && !myPersonId && (
              <p className="mt-3 text-xs text-ink-faint">แตะชื่อของคุณด้านบนก่อน</p>
            )}
          </CardBody>
        </Card>

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
                <CardBody className="space-y-4">
                  {!isPaid && (
                    <>
                      <div className="flex justify-center">
                        <PaymentQRCard
                          source={{ kind: 'public', token, personId: share.personId }}
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
            title="สถานะทุกคน"
            description={
              myPersonId
                ? 'อัปโหลดสลิปได้เฉพาะรายการของคุณเอง'
                : 'เลือกชื่อของคุณด้านบนก่อนจึงจะอัปโหลดสลิปได้'
            }
          />
          <CardBody>
            <PaymentChecklist
              bill={current}
              split={split}
              isOwner={false}
              slipEndpoint={`/api/public/bills/${token}/slips`}
              restrictToPersonId={myPersonId ?? '__none__'}
              onBillUpdate={setBill}
              onSelectPerson={setPreviewPersonId}
              selectedPersonId={activePersonId}
            />
          </CardBody>
        </Card>

        <p className="pb-6 text-center text-xs text-ink-faint">
          ระบบอ่าน QR บนสลิปในเครื่องคุณเอง รูปสลิปไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์
        </p>
      </div>
    </main>
  );
}
