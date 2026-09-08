import { percentOf, splitEvenly } from '@/shared/lib/currency';
import type { Bill, BillCharges, BillItem, Person, PersonShare, SplitResult } from '../types';

export const DEFAULT_CHARGES: BillCharges = { servicePercent: 0, vatPercent: 0, discount: 0 };

/**
 * คำนวณยอดของแต่ละคนแบบไม่ทำเศษสตางค์หาย
 *
 * 1. แต่ละรายการอาหาร -> หารเฉพาะคนที่ถูกติ๊กใน sharedBy (เศษโปะให้คนแรกๆ)
 * 2. ค่าบริการ/VAT -> คิดจากยอดรวมทั้งบิลก่อน แล้วค่อยกระจายตามสัดส่วน
 *    (คิดแยกรายคนแล้วบวกกันจะได้ยอดเพี้ยนจากบิลจริงเพราะปัดเศษหลายรอบ)
 * 3. ส่วนลด -> กระจายตามสัดส่วนเช่นกัน
 *
 * ผลรวมของ shares[].total จะเท่ากับ grandTotal เสมอ
 */
export function calculateSplit(input: {
  people: Person[];
  items: BillItem[];
  charges: BillCharges;
}): SplitResult {
  const { people, items, charges } = input;

  const subtotals: Record<string, number> = {};
  const lines: Record<string, PersonShare['lines']> = {};
  for (const p of people) {
    subtotals[p.id] = 0;
    lines[p.id] = [];
  }

  const knownIds = new Set(people.map((p) => p.id));
  const unassignedItems: BillItem[] = [];
  let unassignedAmount = 0;

  for (const item of items) {
    // กันกรณีคนถูกลบไปแล้วแต่ยังค้างอยู่ใน sharedBy
    const eaters = item.sharedBy.filter((id) => knownIds.has(id));
    if (eaters.length === 0) {
      unassignedItems.push(item);
      unassignedAmount += item.price;
      continue;
    }
    const parts = splitEvenly(item.price, eaters.length);
    eaters.forEach((personId, i) => {
      subtotals[personId] += parts[i];
      lines[personId].push({ itemId: item.id, itemName: item.name, amount: parts[i] });
    });
  }

  const assignedSubtotal = people.reduce((sum, p) => sum + subtotals[p.id], 0);
  const subtotal = assignedSubtotal + unassignedAmount;

  const serviceTotal = percentOf(assignedSubtotal, charges.servicePercent);
  const vatTotal = percentOf(assignedSubtotal + serviceTotal, charges.vatPercent);
  const discountTotal = Math.min(charges.discount, assignedSubtotal + serviceTotal + vatTotal);

  const service = distributeProportionally(serviceTotal, people, subtotals);
  const vat = distributeProportionally(vatTotal, people, subtotals);
  const discount = distributeProportionally(discountTotal, people, subtotals);

  const shares: PersonShare[] = people.map((p) => ({
    personId: p.id,
    name: p.name,
    subtotal: subtotals[p.id],
    service: service[p.id],
    vat: vat[p.id],
    discount: discount[p.id],
    total: subtotals[p.id] + service[p.id] + vat[p.id] - discount[p.id],
    lines: lines[p.id],
  }));

  const byPersonId: Record<string, PersonShare> = {};
  for (const s of shares) byPersonId[s.personId] = s;

  return {
    shares,
    byPersonId,
    subtotal,
    serviceTotal,
    vatTotal,
    discountTotal,
    grandTotal: assignedSubtotal + serviceTotal + vatTotal - discountTotal + unassignedAmount,
    unassignedItems,
    unassignedAmount,
  };
}

/**
 * กระจาย `amount` สตางค์ ตามสัดส่วน weights โดยใช้ largest-remainder method
 * รับประกันว่าผลรวมที่กระจายออกไป = amount เป๊ะ
 */
function distributeProportionally(
  amount: number,
  people: Person[],
  weights: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of people) result[p.id] = 0;
  if (amount === 0 || people.length === 0) return result;

  const totalWeight = people.reduce((sum, p) => sum + (weights[p.id] || 0), 0);
  if (totalWeight === 0) {
    // ไม่มีใครมียอดอาหาร -> หารเท่ากัน
    const parts = splitEvenly(amount, people.length);
    people.forEach((p, i) => (result[p.id] = parts[i]));
    return result;
  }

  const remainders: { id: string; frac: number }[] = [];
  let allocated = 0;
  for (const p of people) {
    const exact = (amount * (weights[p.id] || 0)) / totalWeight;
    const floor = Math.floor(exact);
    result[p.id] = floor;
    allocated += floor;
    remainders.push({ id: p.id, frac: exact - floor });
  }

  // เศษที่เหลือแจกให้คนที่มีทศนิยมมากสุดก่อน
  remainders.sort((a, b) => b.frac - a.frac);
  let leftover = amount - allocated;
  for (let i = 0; leftover > 0; i = (i + 1) % remainders.length) {
    result[remainders[i].id] += 1;
    leftover -= 1;
  }

  return result;
}

/** ใช้กับหน้า checklist: ใครจ่ายแล้ว/ยังไม่จ่าย และยอดที่ยังค้าง */
export function summarizePayments(bill: Bill, split: SplitResult) {
  const paidIds = new Set(
    Object.entries(bill.payments)
      .filter(([, record]) => record.status === 'paid')
      .map(([personId]) => personId),
  );
  const paidAmount = split.shares
    .filter((s) => paidIds.has(s.personId))
    .reduce((sum, s) => sum + s.total, 0);

  return {
    paidCount: split.shares.filter((s) => paidIds.has(s.personId)).length,
    totalCount: split.shares.length,
    paidAmount,
    outstanding: split.grandTotal - paidAmount,
    isSettled: split.shares.length > 0 && split.shares.every((s) => paidIds.has(s.personId)),
  };
}
