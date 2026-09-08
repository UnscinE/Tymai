/**
 * เงินทั้งระบบเก็บเป็น "สตางค์" (integer) เสมอ เพื่อเลี่ยงปัญหา float
 * (0.1 + 0.2 !== 0.3) — แปลงเป็นบาททศนิยมเฉพาะตอนแสดงผลเท่านั้น
 */

export const SATANG_PER_BAHT = 100;

/** "125.50" | 125.5 -> 12550 */
export function toSatang(baht: string | number): number {
  const n = typeof baht === 'string' ? Number(baht.replace(/,/g, '')) : baht;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * SATANG_PER_BAHT);
}

/** 12550 -> 125.5 */
export function toBaht(satang: number): number {
  return satang / SATANG_PER_BAHT;
}

/** 12550 -> "฿125.50" */
export function formatTHB(satang: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toBaht(satang));
}

/** 12550 -> "125.50" (ไม่มีสัญลักษณ์สกุลเงิน) */
export function formatAmount(satang: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toBaht(satang));
}

/**
 * หารเงิน `total` สตางค์ ให้คน `count` คน แบบไม่ทำเศษหาย
 * เศษที่เหลือ (total % count) จะถูกโปะให้คนแรกๆ คนละ 1 สตางค์
 * เช่น 100 / 3 => [34, 33, 33] รวมกันได้ 100 พอดีเสมอ
 */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** คิดเปอร์เซ็นต์บนจำนวนสตางค์ แล้วปัดเป็น integer */
export function percentOf(satang: number, percent: number): number {
  return Math.round((satang * percent) / 100);
}
