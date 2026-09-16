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
    <main className="mx-auto max-w-6xl px-4 py-8 pb-32 md:px-6 md:pb-12">
      <motion.header variants={fadeUp} initial="hidden" animate="show" className="mb-6 hidden md:block">
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

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start">
        {/* คอลัมน์ 1: The Receipt (Left Side - 60% width = 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header: Party Name */}
          <div className="flex flex-col gap-2">
            <label className="sr-only">ชื่อบิล (Party Name)</label>
            <input
              type="text"
              value={draft.title}
              maxLength={80}
              placeholder="เช่น หมูกระทะวันศุกร์"
              onChange={(e) => actions.setTitle(e.target.value)}
              className="w-full border-none bg-transparent p-0 text-3xl font-extrabold tracking-tight text-ink placeholder:text-ink-faint focus:outline-none focus:ring-0"
            />
            <div className="h-0.5 w-full bg-line rounded-full" />
          </div>

          {/* Mobile Only: Participants (Horizontal Scroll) */}
          <div className="block lg:hidden space-y-3">
            <h2 className="text-sm font-semibold text-ink">สมาชิก ({draft.people.length})</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <FriendPicker
                currentUser={currentUser}
                selectedUserIds={draft.people.map((p) => p.userId ?? '').filter(Boolean)}
                onPick={actions.addPersonFromUser}
              />
              <PeopleManager
                people={draft.people}
                onAdd={actions.addPerson}
                onRemove={actions.removePerson}
              />
            </div>
          </div>

          <Card>
            <CardHeader
              title="รายการอาหาร"
              description="เพิ่มเมนูที่กิน แล้วกดขยายเพื่อเลือกคนแชร์"
              action={
                draft.items.length > 0 ? (
                  <span className="text-xs whitespace-nowrap text-ink-faint">
                    {draft.items.length} รายการ
                  </span>
                ) : undefined
              }
            />
            <CardBody className="space-y-5">
              <ItemForm
                disabled={draft.people.length === 0}
                onAdd={(name, price) =>
                  actions.addItem(name, price, draft.people.map((p) => p.id))
                }
              />
              {draft.people.length === 0 && (
                <p className="text-xs text-ink-faint">เพิ่มสมาชิกก่อนจึงจะเพิ่มเมนูได้</p>
              )}

              <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-3">
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
        </div>

        {/* คอลัมน์ 2: Participants & Summary (Right Side - 40% width = 5 columns, Sticky) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6 lg:self-start z-10 pb-20 lg:pb-0">
          
          {/* Desktop Only: Participants */}
          <div className="hidden lg:block space-y-4">
            <Card>
              <CardHeader title="สมาชิกร่วมโต๊ะ" description="เพิ่มคนที่ร่วมหารบิลนี้" />
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
          </div>

          <Card>
            <CardHeader title="ค่าบริการ และส่วนลด" />
            <CardBody>
              <ChargesPanel charges={draft.charges} split={split} onChange={actions.setCharges} />
            </CardBody>
          </Card>

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
                  <p className="py-8 text-center text-xs text-ink-faint">
                    เลือกคนที่มียอดค้างชำระด้านล่าง <br />เพื่อดูตัวอย่าง QR
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader title="สรุปยอดแต่ละคน" />
            <CardBody>
              <BillSummary
                split={split}
                selectedPersonId={selectedPersonId}
                onSelectPerson={setSelectedPersonId}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Bar (Mobile & Desktop) for Call to Action */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface/80 p-4 backdrop-blur-md lg:static lg:mt-6 lg:border-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 lg:justify-end lg:flex-row-reverse">
          <div className="flex flex-col lg:hidden">
            <span className="text-xs text-ink-muted">ยอดรวมทั้งบิล</span>
            <span className="text-xl font-extrabold tabular-nums text-brand">
              {formatAmount(split.grandTotal)}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-surface-alt px-4 py-2 rounded-xl">
             <span className="text-sm text-ink-muted">ยอดรวมทั้งบิล</span>
             <span className="text-2xl font-extrabold tabular-nums text-brand">
               {formatAmount(split.grandTotal)}
             </span>
          </div>

          <Button 
            className="flex-1 lg:flex-none lg:w-64 lg:text-lg lg:h-14" 
            onClick={handlePublish} 
            disabled={publishing || !canPublish}
          >
            {publishing ? 'กำลังสร้างบิล...' : 'ยืนยันบิล & เก็บเงิน'}
          </Button>
        </div>
        {!canPublish && (
          <p className="mt-2 text-center text-xs text-ink-faint lg:text-right">
            {hasPayee
              ? 'ต้องมีสมาชิกอย่างน้อย 1 คน และรายการอาหารอย่างน้อย 1 รายการ'
              : 'ต้องตั้งค่าเลข PromptPay ก่อนจึงจะสร้างบิลได้'}
          </p>
        )}
        {error && <p className="mt-1 text-center text-xs text-danger-ink lg:text-right">{error}</p>}
        {split.unassignedItems.length > 0 && (
          <p className="mt-1 text-center text-xs text-warning-ink lg:text-right">
            มี {split.unassignedItems.length} รายการที่ไม่มีคนจ่าย
          </p>
        )}
      </div>
    </main>
  );
}

function BuilderSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-alt" />
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-5">
           <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
        </div>
        <div className="lg:col-span-5 space-y-5">
           <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" />
           <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
        </div>
      </div>
    </main>
  );
}
