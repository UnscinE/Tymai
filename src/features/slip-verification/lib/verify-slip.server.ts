import 'server-only';
import { extractSlipFields, isSlipPayload } from './slip-payload';
import type { SlipFailureReason } from '../types';

export type ServerVerifyInput = {
  payload: string;
  /** ยอดที่คนนี้ต้องจ่าย (สตางค์) — ใช้เมื่อเสียบ Slip Verification API ในอนาคต */
  expectedAmount: number;
};

export type ServerVerifyResult =
  | { ok: true; transRef?: string; sendingBank?: string }
  | { ok: false; reason: SlipFailureReason; message: string };

/**
 * การยืนยันสลิป "ระดับ A" — ไม่พึ่ง API ธนาคาร แบ่งเป็นสองด่าน:
 *
 *   1. ที่นี่: ตรวจว่า payload เป็น QR สลิปโอนเงินจริง (ไม่ใช่ QR รับเงินที่เอามาวนใช้)
 *   2. ที่ recordVerifiedSlip(): กันสลิปซ้ำด้วย unique constraint บน Payment.slipFingerprint
 *
 * ด่านที่ 2 อยู่ในชั้นฐานข้อมูลโดยเจตนา — ให้ DB เป็นคนตัดสินว่าใครถึงก่อน
 * ถ้าเช็คในโค้ดก่อนเขียน สองรีเควสต์ที่มาพร้อมกันจะผ่านการเช็คทั้งคู่
 *
 * ข้อจำกัดที่ต้องรู้: QR บนสลิปไทยไม่มีข้อมูลยอดเงิน ระบบจึงยัง "เทียบยอด" ไม่ได้
 * ถ้าต้องการยืนยันยอดจริง ให้เสียบ Slip Verification API (EasySlip / SlipOK / SCB)
 * ที่ verifyAmountWithProvider() ด้านล่าง
 */
export function verifySlip(input: ServerVerifyInput): ServerVerifyResult {
  const payload = input.payload.trim();

  if (!isSlipPayload(payload)) {
    return {
      ok: false,
      reason: 'not-a-slip',
      message: 'QR ที่อ่านได้ไม่ใช่ QR สลิปโอนเงิน กรุณาอัปโหลดสลิปจากแอปธนาคาร',
    };
  }

  // --- จุดเสียบ Slip Verification API (ระดับ B) ---
  // const amountCheck = await verifyAmountWithProvider(fields.transRef, input.expectedAmount);
  // if (!amountCheck.ok) return amountCheck;

  return { ok: true, ...extractSlipFields(payload) };
}
