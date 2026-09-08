import 'server-only';
import { db } from '@/server/db';
import { calculateSplit } from '@/features/bill-split/lib/calculate-split';
import { fingerprintPayload } from '@/features/slip-verification/lib/slip-payload';
import { verifySlip } from '@/features/slip-verification/lib/verify-slip.server';
import type { Bill } from '@/features/bill-split/types';
import { getBill, recordVerifiedSlip } from './bill-service';

export type SlipIntakeResult =
  | { ok: true; bill: Bill; alreadyPaid?: true }
  | { ok: false; status: number; reason: string; message: string };

/**
 * เส้นทางรับสลิปที่ใช้ร่วมกันระหว่างหน้าที่ต้อง login กับลิงก์สาธารณะ
 * ทั้งสองทางต้องผ่านการตรวจชุดเดียวกัน — ห้ามมีทางไหนหลวมกว่าอีกทาง
 */
export async function intakeSlip(params: {
  bill: Bill;
  participantId: string;
  payload: string;
}): Promise<SlipIntakeResult> {
  const { bill, participantId, payload } = params;

  const participant = bill.people.find((p) => p.id === participantId);
  if (!participant) {
    return { ok: false, status: 400, reason: 'unknown', message: 'ไม่พบสมาชิกคนนี้ในบิล' };
  }

  if (bill.payments[participantId]?.status === 'paid') {
    return { ok: true, bill, alreadyPaid: true };
  }

  // คำนวณยอดฝั่ง server เสมอ ไม่รับยอดที่ client ส่งมา
  const split = calculateSplit(bill);
  const expectedAmount = split.byPersonId[participantId]?.total ?? 0;

  const verdict = verifySlip({ payload, expectedAmount });
  if (!verdict.ok) {
    return { ok: false, status: 409, reason: verdict.reason, message: verdict.message };
  }

  const fingerprint = await fingerprintPayload(payload);
  const saved = await recordVerifiedSlip({
    billId: bill.id,
    participantId,
    fingerprint,
    transRef: verdict.transRef,
    sendingBank: verdict.sendingBank,
    amountSatang: expectedAmount,
  });

  if (!saved.ok) {
    return { ok: false, status: 409, reason: saved.reason, message: saved.message };
  }

  return { ok: true, bill: saved.bill };
}

/** ผู้ใช้ที่ login แล้วอัปโหลดสลิปแทน participant คนนี้ได้ไหม */
export async function canUploadFor(params: {
  billId: string;
  participantId: string;
  userId: string;
  isCreator: boolean;
}): Promise<boolean> {
  if (params.isCreator) return true;
  const row = await db.billParticipant.findFirst({
    where: { id: params.participantId, billId: params.billId, userId: params.userId },
    select: { id: true },
  });
  return Boolean(row);
}

/** อ่าน payload ที่ client ส่งมา พร้อมตรวจขนาดคร่าวๆ ก่อนเข้ากระบวนการจริง */
export function readSlipBody(body: unknown): { personId: string; payload: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const o = body as Record<string, unknown>;
  const personId = typeof o.personId === 'string' ? o.personId : '';
  const payload = typeof o.payload === 'string' ? o.payload.trim() : '';
  if (!personId || !payload || payload.length > 512) return null;
  return { personId, payload };
}

export { getBill };
