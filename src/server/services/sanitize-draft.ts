import 'server-only';
import { DEFAULT_CHARGES } from '@/features/bill-split/lib/calculate-split';
import type { BillItem, DraftBill, Person } from '@/features/bill-split/types';

const MAX_PEOPLE = 50;
const MAX_ITEMS = 200;
const MAX_ITEM_PRICE = 100_000_00; // 1 แสนบาท

/** ไม่เชื่อ payload จาก client เลย — normalize ใหม่ทั้งหมดก่อนเก็บ */
export function sanitizeDraft(input: unknown): DraftBill | null {
  if (typeof input !== 'object' || input === null) return null;
  const raw = input as Record<string, unknown>;

  const people = asArray(raw.people)
    .slice(0, MAX_PEOPLE)
    .map((p): Person | null => {
      const o = p as Record<string, unknown>;
      const id = str(o.id, 64);
      const name = str(o.name, 60);
      // เก็บ userId ดิบไว้ก่อน — createBill จะกรองว่าเป็นเพื่อนกันจริงไหมอีกชั้น
      const userId = str(o.userId, 64) || null;
      return id && name ? { id, name, userId } : null;
    })
    .filter((p): p is Person => p !== null);

  const validIds = new Set(people.map((p) => p.id));

  const items = asArray(raw.items)
    .slice(0, MAX_ITEMS)
    .map((it): BillItem | null => {
      const o = it as Record<string, unknown>;
      const id = str(o.id, 64);
      const name = str(o.name, 80);
      const price = Math.round(Number(o.price));
      if (!id || !name || !Number.isInteger(price) || price < 0 || price > MAX_ITEM_PRICE) return null;
      const sharedBy = asArray(o.sharedBy)
        .map((v) => str(v, 64))
        .filter((v): v is string => Boolean(v) && validIds.has(v));
      return { id, name, price, sharedBy: [...new Set(sharedBy)] };
    })
    .filter((i): i is BillItem => i !== null);

  const rawCharges = (raw.charges ?? {}) as Record<string, unknown>;

  return {
    title: str(raw.title, 80) || 'บิลค่าอาหาร',
    people,
    items,
    charges: {
      ...DEFAULT_CHARGES,
      servicePercent: clamp(Number(rawCharges.servicePercent) || 0, 0, 100),
      vatPercent: clamp(Number(rawCharges.vatPercent) || 0, 0, 100),
      discount: Math.max(0, Math.round(Number(rawCharges.discount) || 0)),
    },
  };
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}
