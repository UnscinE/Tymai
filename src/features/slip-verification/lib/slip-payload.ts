import { findTag, isCrcValid, parseTLV } from './parse-emvco';
import type { DecodedSlip } from '../types';

/**
 * mini-QR บนสลิปโอนเงินของธนาคารไทย บรรจุแค่ "รหัสธนาคารผู้ส่ง + เลขอ้างอิงธุรกรรม"
 * ไม่มียอดเงิน ไม่มีชื่อผู้รับ ไม่มีเวลา
 *
 * การยืนยันระดับที่ทำได้โดยไม่พึ่ง API ธนาคาร (ระดับ A):
 *   1. ปฏิเสธ QR "รับเงิน" (Thai QR / PromptPay) ไม่ให้เอามาอัปโหลดแทนสลิป
 *   2. ปฏิเสธ QR ที่ไม่ใช่รูปแบบสลิปเลย (ลิงก์เว็บ, ข้อความทั่วไป, QR ไวไฟ ฯลฯ)
 *   3. กันสลิปซ้ำด้วย fingerprint — สลิปหนึ่งใบใช้ยืนยันได้ครั้งเดียวทั้งระบบ
 *
 * หมายเหตุสำคัญ: รูปแบบ TLV ของ mini-QR ต่างกันเล็กน้อยในแต่ละธนาคาร และไม่มีสเปก
 * สาธารณะที่ครบถ้วน โค้ดนี้จึงตรวจแบบ "กว้างพอที่จะไม่ปฏิเสธสลิปจริง" แล้วไปเข้มที่
 * การกันสลิปซ้ำแทน ถ้าเก็บตัวอย่างสลิปจริงจากหลายธนาคารได้แล้ว ค่อยกลับมารัดกุมขึ้นตรงนี้
 * ส่วนการเทียบ "ยอดเงินตรงไหม" ต้องต่อ Slip Verification API — ดู verify-slip.server.ts
 */

const MIN_LENGTH = 16;
const MAX_LENGTH = 512;

/** QR รับเงิน (PromptPay/Thai QR) มีทั้ง tag 53 (สกุลเงิน) และ tag 58 (ประเทศ) */
export function isPaymentQR(payload: string): boolean {
  const nodes = parseTLV(payload);
  return Boolean(findTag(nodes, '53') && findTag(nodes, '58'));
}

export function isSlipPayload(payload: string): boolean {
  const trimmed = payload.trim();

  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return false;

  // payload ของสลิปเป็นตัวเลข/ตัวอักษรล้วน ไม่มีช่องว่าง ไม่มี :// ไม่มีภาษาไทย
  if (!/^[0-9A-Za-z]+$/.test(trimmed)) return false;

  // ขึ้นต้นด้วยคู่ tag+length ของ EMVCo เสมอ
  if (!/^\d{4}/.test(trimmed)) return false;

  // ห้ามเป็น QR รับเงิน — กันคนเอา QR ที่ระบบสร้างให้เองวนกลับมาอัปโหลดเป็นสลิป
  if (isPaymentQR(trimmed)) return false;

  // ถ้ามี CRC ต่อท้ายตามมาตรฐาน ต้องถูกต้อง (บางธนาคารไม่ใส่ -> ข้าม)
  if (trimmed.length > 8 && trimmed.lastIndexOf('6304') === trimmed.length - 8) {
    if (!isCrcValid(trimmed)) return false;
  }

  return true;
}

/**
 * ดึงข้อมูลเท่าที่แกะได้ แบบ best-effort
 * ลอง TLV ก่อน ถ้าโครงสร้างไม่ตรงค่อยถอยไปหาช่วงตัวเลขยาวๆ ในสตริงตรงๆ
 */
export function extractSlipFields(payload: string): Pick<DecodedSlip, 'transRef' | 'sendingBank'> {
  const trimmed = payload.trim();
  const nodes = parseTLV(trimmed);
  const candidates = nodes.flatMap((n) => (n.children ? n.children : [n]));

  const fromTlv = candidates
    .filter((n) => n.tag !== '00' && /^[0-9A-Za-z]{10,}$/.test(n.value))
    .sort((a, b) => b.value.length - a.value.length)[0]?.value;

  // fallback: ช่วงตัวเลขติดกันที่ยาวที่สุด แต่ต้องไม่ใช่ทั้ง payload (นั่นแปลว่าแกะไม่ออกจริงๆ)
  const fromRaw = (trimmed.match(/\d{10,30}/g) ?? [])
    .filter((m) => m.length < trimmed.length)
    .sort((a, b) => b.length - a.length)[0];

  const bank = candidates.find((n) => n.tag !== '00' && /^\d{3}$/.test(n.value))?.value;

  return { transRef: fromTlv ?? fromRaw, sendingBank: bank };
}

/** sha-256 hex — กุญแจกันสลิปซ้ำ (ใช้ได้ทั้งบน browser และ node) */
export async function fingerprintPayload(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload.trim());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
