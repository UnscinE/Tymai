'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  BillSummary, ChargesPanel, FriendPicker, ItemForm, ItemRow, LogoPicker, PaymentQRCard,
  PeopleManager, useBillSplit, usePublishBill, useQrLogo,
} from '@/features';
import {
  Button, Card, CardBody, CardHeader, fadeUp, formatAmount, Input, staggerList,
} from '@/shared';

/**
 * หน้าสร้างบิล — เดิมอยู่ที่ `/` และทำงานแบบไม่ต้อง login
 * ตอนนี้ต้อง login เพราะบิลผูกกับบัญชีผู้ใช้ (Bill.creatorId) แทน ownerToken ใน localStorage
 *
 * ฉบับร่างยังอยู่ใน localStorage เหมือนเดิม เพื่อให้ปิดแท็บแล้วกลับมาทำต่อได้
 * และจะกลายเป็นบิลจริงในฐานข้อมูลเมื่อกด "สร้างบิลและเก็บเงิน"
 */
export function BillBuilder({
  accountName,
  hasPayee,
  currentUser,
}: {
  accountName: string;
  /** ตั้งเลข PromptPay ไว้หรือยัง — ถ้ายัง สร้างบิลไปก็ไม่มี QR ให้เพื่อนสแกน */
  hasPayee: boolean;
  currentUser: { id: string; name: string };
}) {
  const router = useRouter();
  const { draft, split, hydrated, actions } = useBillSplit();
  const { publish, publishing, error } = usePublishBill();
  const logo = useQrLogo();

  // เก็บเฉพาะ 'คนที่ผู้ใช้กดเลือกเอง' — ตัวที่แสดงผลจริงคำนวณด้านล่าง
  const [pickedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // คนที่ถูกเลือกคำนวณระหว่าง render ไม่ใช่ผ่าน useEffect
  // ถ้าใช้ effect จะเกิด render ซ้อนหนึ่งรอบทุกครั้งที่รายการเปลี่ยน (cascading render)
  const selectedPersonId =
    pickedPersonId && split.byPersonId[pickedPersonId]
      ? pickedPersonId
      : (split.shares[0]?.personId ?? null);

  const selectedShare = selectedPersonId ? split.byPersonId[selectedPersonId] : undefined;
  const logoSrc = logo.logo.kind === 'none' ? undefined : logo.logo.src;

  const canPublish = useMemo(
    () => hasPayee && draft.people.length > 0 && draft.items.length > 0 && split.grandTotal > 0,
    [hasPayee, draft, split],
  );

  const handlePublish = async () => {
    const bill = await publish(draft);
    if (!bill) return;
    // ฉบับร่างถูกแปลงเป็นบิลจริงแล้ว ล้างทิ้งเพื่อให้ครั้งหน้าเริ่มใหม่จากศูนย์
    actions.reset();
    router.push(`/bills/${bill.id}/manage`);
  };

  if (!hydrated) return <BuilderSkeleton />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">สร้างบิลใหม่</h1>
        <p className="mt-1 text-sm text-ink-muted">
          จับคู่เมนูกับคนกิน แล้วสร้าง PromptPay QR ให้แต่ละคน พร้อมเช็คสลิปอัตโนมัติ
        </p>
      </motion.header>

      {!hasPayee && (
        <div className="mb-5 rounded-2xl border border-warning/40 bg-warning-soft p-4">
          <p className="text-sm font-semibold text-warning-ink">ยังตั้งค่าบัญชีรับเงินไม่ครบ</p>
          <p className="mt-1 text-sm text-warning-ink/90">
            ต้องใส่เลข PromptPay ของคุณก่อน ไม่งั้นเพื่อนจะไม่มี QR ให้สแกนจ่าย
          </p>
          <Link href="/settings" className="mt-2 inline-block">
            <Button size="sm">ไปตั้งค่าเลข PromptPay</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* คอลัมน์ 1: รายการอาหาร และคนกิน */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="สมาชิกร่วมโต๊ะ"
              description="เลือกจากเพื่อน หรือพิมพ์ชื่อเองสำหรับคนที่ไม่มีบัญชี"
            />
            <CardBody className="space-y-4">
              <FriendPicker
                currentUser={currentUser}
                selectedUserIds={draft.people.map((p) => p.userId ?? '').filter(Boolean)}
                onPick={actions.addPersonFromUser}
              />

              <div className="border-t border-line pt-4">
                <PeopleManager
                  people={draft.people}
                  onAdd={actions.addPerson}
                  onRemove={actions.removePerson}
                />
              </div>
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

        {/* คอลัมน์ 2: สรุปยอด และปุ่มสร้างบิล */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="สรุปยอดแต่ละคน" description="กดเลือกคนเพื่อดู QR ของคนนั้น" />
            <CardBody>
              <BillSummary
                split={split}
                selectedPersonId={selectedPersonId}
                onSelectPerson={setSelectedPersonId}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ยืนยันบิล" description="สร้างแล้วยอดจะถูกล็อก แก้ไม่ได้" />
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

              <div className="flex items-baseline justify-between rounded-xl bg-surface-alt px-3 py-2">
                <span className="text-sm text-ink-muted">ยอดรวมทั้งบิล</span>
                <span className="text-lg font-bold tabular-nums text-brand">
                  {formatAmount(split.grandTotal)}
                </span>
              </div>

              <Button className="w-full" onClick={handlePublish} disabled={publishing || !canPublish}>
                {publishing ? 'กำลังสร้างบิล...' : 'สร้างบิลและเก็บเงิน'}
              </Button>

              {!canPublish && (
                <p className="text-xs text-ink-faint">
                  {hasPayee
                    ? 'ต้องมีสมาชิกอย่างน้อย 1 คน และรายการอาหารที่มีคนกินอย่างน้อย 1 รายการ'
                    : 'ต้องตั้งค่าเลข PromptPay ก่อนจึงจะสร้างบิลได้'}
                </p>
              )}
              {error && <p className="text-xs text-danger-ink">{error}</p>}
              {split.unassignedItems.length > 0 && (
                <p className="text-xs text-warning-ink">
                  มี {split.unassignedItems.length} รายการที่ยังไม่ได้เลือกคนกิน ยอดนี้จะไม่ถูกเก็บจากใคร
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* คอลัมน์ 3: QR ตัวอย่าง */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="ตัวอย่าง QR" description="หน้าตาที่เพื่อนจะเห็นตอนจ่าย" />
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
                    source={{ kind: 'own', amountSatang: selectedShare.total }}
                    amountSatang={selectedShare.total}
                    payerName={selectedShare.name}
                    billTitle={draft.title}
                    logoSrc={logoSrc}
                    fallbackAccountName={accountName}
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

function BuilderSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-alt" />
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
        ))}
      </div>
    </main>
  );
}
