import 'server-only';
import { getKV } from './kv';
import { shortId } from '@/shared/lib/id';
import type { Bill, DraftBill } from '@/features/bill-split/types';

/** บิลอยู่ได้ 30 วัน แล้วหายไปเอง */
export const BILL_TTL_SECONDS = 60 * 60 * 24 * 30;

type BillRecord = {
  bill: Bill;
  /** โทเคนของเจ้าของบิล — ไม่เคยถูกส่งกลับไปกับ GET */
  ownerToken: string;
};

const billKey = (id: string) => `bill:${id}`;
const slipKey = (fingerprint: string) => `slip:${fingerprint}`;

export async function createBill(
  draft: DraftBill,
  accountName: string,
): Promise<{ bill: Bill; ownerToken: string }> {
  const kv = getKV();
  const now = new Date().toISOString();
  const ownerToken = shortId(24);

  // ชน id ยากมาก แต่ลองซ้ำสัก 5 รอบกันไว้
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = shortId(10);
    const bill: Bill = {
      id,
      title: draft.title,
      people: draft.people,
      items: draft.items,
      charges: draft.charges,
      payments: {},
      accountName,
      createdAt: now,
      updatedAt: now,
    };
    const created = await kv.setIfAbsent<BillRecord>(billKey(id), { bill, ownerToken }, BILL_TTL_SECONDS);
    if (created) return { bill, ownerToken };
  }
  throw new Error('สร้างบิลไม่สำเร็จ กรุณาลองใหม่');
}

export async function getBill(id: string): Promise<Bill | null> {
  const record = await getKV().get<BillRecord>(billKey(id));
  return record?.bill ?? null;
}

export async function isBillOwner(id: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const record = await getKV().get<BillRecord>(billKey(id));
  return Boolean(record && timingSafeEqual(record.ownerToken, token));
}

/**
 * อัปเดตบิลแบบ read-modify-write
 * หมายเหตุ: Upstash ไม่มี transaction แบบ compare-and-swap ในชั้นนี้
 * แต่ workload จริง (คนละคนติ๊กคนละแถว) ชนกันยากมาก และการเขียนซ้ำไม่ทำให้เงินผิด
 */
export async function updateBill(
  id: string,
  mutate: (bill: Bill) => Bill,
): Promise<Bill | null> {
  const kv = getKV();
  const record = await kv.get<BillRecord>(billKey(id));
  if (!record) return null;
  const next = { ...mutate(record.bill), updatedAt: new Date().toISOString() };
  await kv.set<BillRecord>(billKey(id), { ...record, bill: next }, BILL_TTL_SECONDS);
  return next;
}

/**
 * จองลายนิ้วมือของสลิป — คืน false ถ้าสลิปใบนี้เคยถูกใช้ยืนยันไปแล้ว
 * (ทำเป็น atomic ผ่าน SET NX เพื่อกันคนสองคนยิงสลิปใบเดียวกันพร้อมกัน)
 */
export async function claimSlipFingerprint(
  fingerprint: string,
  claim: { billId: string; personId: string },
): Promise<boolean> {
  return getKV().setIfAbsent(slipKey(fingerprint), claim, BILL_TTL_SECONDS);
}

export async function releaseSlipFingerprint(fingerprint: string): Promise<void> {
  await getKV().del(slipKey(fingerprint));
}

export async function getSlipClaim(fingerprint: string) {
  return getKV().get<{ billId: string; personId: string }>(slipKey(fingerprint));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
