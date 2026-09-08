'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import {
  BillSummary,
  ChargesPanel,
  ItemForm,
  ItemRow,
  PeopleManager,
  calculateSplit,
  summarizePayments,
  useBillSplit,
} from '@/features/bill-split';
import { ShareLinkPanel, usePublishBill, useSharedBill } from '@/features/bill-sharing';
import { LogoPicker, PaymentQRCard, useQrLogo } from '@/features/qr-generator';
import { PaymentChecklist } from '@/features/slip-verification';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { fadeUp, staggerList } from '@/shared/components/motion/variants';
import { formatAmount } from '@/shared/lib/currency';

export default function OwnerBillPage() {
  const { draft, split, hydrated, actions } = useBillSplit();
  const { ownership, hydrated: ownershipHydrated, publish, publishing, error, forget } = usePublishBill();
  const { bill: sharedBill, setBill: setSharedBill, status: sharedStatus } = useSharedBill(
    ownership?.billId ?? null,
  );
  const logo = useQrLogo();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // บิลที่แชร์แล้วเป็น snapshot — ยอดในหน้า checklist ต้องคำนวณจาก snapshot นั้น ไม่ใช่จากฉบับร่าง
  const sharedSplit = useMemo(() => (sharedBill ? calculateSplit(sharedBill) : null), [sharedBill]);
  const activeSplit = sharedSplit ?? split;
  const isPublished = Boolean(ownership && sharedBill && sharedStatus === 'ready');

  // ฉบับร่างเปลี่ยนไปจากบิลที่แชร์ไว้แล้วหรือยัง
  const draftChanged = useMemo(() => {
    if (!sharedBill) return false;
    return (
      JSON.stringify({ p: draft.people, i: draft.items, c: draft.charges }) !==
      JSON.stringify({ p: sharedBill.people, i: sharedBill.items, c: sharedBill.charges })
    );
  }, [draft, sharedBill]);

  useEffect(() => {
    const shares = activeSplit.shares;
    if (shares.length === 0) {
      setSelectedPersonId(null);
      return;
    }
    setSelectedPersonId((current) =>
      current && shares.some((s) => s.personId === current) ? current : shares[0].personId,
    );
  }, [activeSplit]);

  const selectedShare = selectedPersonId ? activeSplit.byPersonId[selectedPersonId] : undefined;
  const payments = sharedBill ? summarizePayments(sharedBill, activeSplit) : null;
  const logoSrc = logo.logo.kind === 'none' ? undefined : logo.logo.src;

  const handlePublish = async () => {
    const bill = await publish(draft);
    if (bill) setSharedBill(bill);
  };

  if (!hydrated || !ownershipHydrated) {
    return <PageSkeleton />;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-12">
      <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink">หารค่าอาหาร</h1>
          {isPublished && <Badge tone="brand">แชร์แล้ว</Badge>}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          จับคู่เมนูกับคนกิน แล้วสร้าง PromptPay QR ให้แต่ละคน พร้อมเช็คสลิปอัตโนมัติ
        </p>
      </motion.header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* คอลัมน์ 1: รายการอาหาร และคนกิน */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="สมาชิกร่วมโต๊ะ" description="ใครนั่งโต๊ะนี้บ้าง" />
            <CardBody>
              <PeopleManager
                people={draft.people}
                onAdd={actions.addPerson}
                onRemove={actions.removePerson}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="รายการอาหาร"
              description="ติ๊กชื่อคนใต้แต่ละเมนู เพื่อบอกว่าใครกินอะไร"
              action={
                draft.items.length > 0 ? (
                  <span className="text-xs whitespace-nowrap text-ink-faint">
                    {draft.items.length} รายการ
                  </span>
                ) : undefined
              }
            />
            <CardBody className="space-y-4">
              <ItemForm
                disabled={draft.people.length === 0}
                onAdd={(name, price) =>
                  // ค่าเริ่มต้น: หารทุกคน แล้วผู้ใช้ค่อยติ๊กออกทีละคน
                  actions.addItem(name, price, draft.people.map((p) => p.id))
                }
              />
              {draft.people.length === 0 && (
                <p className="text-xs text-ink-faint">เพิ่มสมาชิกก่อนจึงจะเพิ่มเมนูได้</p>
              )}

              <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {draft.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      people={draft.people}
                      onToggleEater={actions.toggleEater}
                      onSelectAll={actions.setItemEaters}
                      onRemove={actions.removeItem}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ค่าบริการ และส่วนลด" description="คิดตามสัดส่วนยอดของแต่ละคน" />
            <CardBody>
              <ChargesPanel charges={draft.charges} split={split} onChange={actions.setCharges} />
            </CardBody>
          </Card>
        </div>

        {/* คอลัมน์ 2: สรุปยอด / checklist / แชร์ */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={isPublished ? 'สถานะการจ่ายเงิน' : 'สรุปยอดแต่ละคน'}
              description={
                payments
                  ? `จ่ายแล้ว ${payments.paidCount}/${payments.totalCount} คน ค้างอยู่ ${formatAmount(payments.outstanding)} บาท`
                  : 'กดเลือกคนเพื่อดู QR ของคนนั้น'
              }
            />
            <CardBody>
              {isPublished && sharedBill && sharedSplit ? (
                <PaymentChecklist
                  bill={sharedBill}
                  split={sharedSplit}
                  isOwner
                  ownerToken={ownership?.ownerToken}
                  onBillUpdate={setSharedBill}
                  onSelectPerson={setSelectedPersonId}
                  selectedPersonId={selectedPersonId}
                />
              ) : (
                <BillSummary
                  split={split}
                  selectedPersonId={selectedPersonId}
                  onSelectPerson={setSelectedPersonId}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="แชร์ให้เพื่อน" description="เพื่อนอัปโหลดสลิปเองได้จากลิงก์นี้" />
            <CardBody className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">ชื่อบิล</span>
                <Input
                  value={draft.title}
                  maxLength={80}
                  placeholder="เช่น หมูกระทะวันศุกร์"
                  onChange={(e) => actions.setTitle(e.target.value)}
                />
              </label>

              {isPublished && ownership ? (
                <>
                  <ShareLinkPanel
                    billId={ownership.billId}
                    onReset={() => {
                      forget();
                      actions.reset();
                      setSharedBill(null);
                    }}
                  />
                  <AnimatePresence>
                    {draftChanged && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs text-warning-ink">
                          คุณแก้ไขบิลหลังจากแชร์ไปแล้ว ลิงก์เดิมยังเป็นยอดเก่าอยู่
                          <Button
                            size="sm"
                            className="mt-2 w-full"
                            onClick={handlePublish}
                            disabled={publishing}
                          >
                            {publishing ? 'กำลังสร้าง...' : 'สร้างลิงก์ใหม่จากยอดล่าสุด'}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={handlePublish}
                    disabled={publishing || draft.people.length === 0 || draft.items.length === 0}
                  >
                    {publishing ? 'กำลังสร้างลิงก์...' : 'แชร์บิลนี้'}
                  </Button>
                  {draft.items.length === 0 && (
                    <p className="text-xs text-ink-faint">ต้องมีอย่างน้อย 1 เมนูก่อนจึงจะแชร์ได้</p>
                  )}
                </>
              )}

              {error && <p className="text-xs text-danger-ink">{error}</p>}
              {ownership && sharedStatus === 'not-found' && (
                <p className="text-xs text-danger-ink">
                  ลิงก์บิลเดิมหมดอายุแล้ว กดปุ่มแชร์บิลนี้เพื่อสร้างใหม่
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* คอลัมน์ 3: QR */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="PromptPay QR" description="สแกนจ่ายได้ทันที ยอดถูกใส่มาให้แล้ว" />
            <CardBody className="space-y-4">
              <LogoPicker
                logo={logo.logo}
                presets={logo.presets}
                error={logo.error}
                onSelectPreset={logo.selectPreset}
                onUpload={logo.uploadLogo}
                onClear={logo.clearLogo}
              />

              {/*
                ไม่ใช้ AnimatePresence ตรงนี้: การ์ด QR เป็น component ของเราเอง
                AnimatePresence mode="wait" จะค้างรอ exit ของ child ตัวเก่าจนไม่สลับให้
                ตัวการ์ดมีอนิเมชัน scaleIn ในตัวอยู่แล้ว และ key ทำให้เล่นใหม่เมื่อเปลี่ยนคน/ยอด
              */}
              <div className="flex justify-center pt-1">
                {selectedShare && selectedShare.total > 0 ? (
                  <PaymentQRCard
                    key={`${selectedShare.personId}-${selectedShare.total}`}
                    amountSatang={selectedShare.total}
                    payerName={selectedShare.name}
                    billTitle={sharedBill?.title ?? draft.title}
                    logoSrc={logoSrc}
                    fallbackAccountName={sharedBill?.accountName}
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

function PageSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-12">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-alt" />
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
        ))}
      </div>
    </main>
  );
}
