import 'server-only';
import { claimSlipFingerprint, getSlipClaim } from '@/server/bill-store';
import { extractSlipFields, isSlipPayload } from './slip-payload';
import type { SlipFailureReason } from '../types';

export type ServerVerifyInput = {
  billId: string;
  personId: string;
  payload: string;
  fingerprint: string;
  /** ยอดที่คนนี้ต้องจ่าย (สตางค์) — ใช้เมื่อเสียบ Slip Verification API ในอนาคต */
  expectedAmount: number;
};

export type ServerVerifyResult =
  | { ok: true; transRef?: string; sendingBank?: string }
  | { ok: false; reason: SlipFailureReason; message: string };

/**
 * การยืนยันสลิป "ระดับ A" — ไม่พึ่ง API ธนาคาร
 *
 *   1. ตรวจว่า payload เป็น QR สลิปโอนเงินจริง (ไม่ใช่ QR รับเงินที่เอามาวนใช้)
 *   2. ตรวจว่า fingerprint นี้ยังไม่เคยถูกใช้ยืนยันที่ไหนมาก่อน (กันส่งสลิปซ้ำ/ส่งต่อกันในกลุ่ม)
 *
 * ข้อจำกัดที่ต้องรู้: QR บนสลิปไทยไม่มีข้อมูลยอดเงิน ระบบจึงยัง "เทียบยอด" ไม่ได้
 * ถ้าต้องการยืนยันยอดจริง ให้เสียบ Slip Verification API (EasySlip / SlipOK / SCB)
 * ที่ฟังก์ชัน verifyAmountWithProvider() ด้านล่าง แล้วเปิดใช้ในบล็อกที่คอมเมนต์ไว้
 */
export async function verifySlip(input: ServerVerifyInput): Promise<ServerVerifyResult> {
  const payload = input.payload.trim();

  if (!isSlipPayload(payload)) {
    return {
      ok: false,
      reason: 'not-a-slip',
      message: 'QR ที่อ่านได้ไม่ใช่ QR สลิปโอนเงิน กรุณาอัปโหลดสลิปจากแอปธนาคาร',
    };
  }

  const claimed = await claimSlipFingerprint(input.fingerprint, {
    billId: input.billId,
    personId: input.personId,
  });

  if (!claimed) {
    const existing = await getSlipClaim(input.fingerprint);
    const sameBill = existing?.billId === input.billId;
    return {
      ok: false,
      reason: 'duplicate',
      message: sameBill
        ? 'สลิปใบนี้ถูกใช้ยืนยันในบิลนี้ไปแล้ว'
        : 'สลิปใบนี้เคยถูกใช้ยืนยันไปแล้ว กรุณาใช้สลิปของการโอนครั้งนี้',
    };
  }

  const fields = extractSlipFields(payload);

  // --- จุดเสียบ Slip Verification API (ระดับ B) ---
  // const amountCheck = await verifyAmountWithProvider(fields.transRef, input.expectedAmount);
  // if (!amountCheck.ok) {
  //   await releaseSlipFingerprint(input.fingerprint); // คืนสิทธิ์ให้ลองใหม่ได้
  //   return amountCheck;
  // }

  return { ok: true, ...fields };
}
