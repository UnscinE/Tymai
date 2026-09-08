import 'server-only';
import generatePayload from 'promptpay-qr';
import { calculateSplit } from '@/features/bill-split/lib/calculate-split';
import type { Bill } from '@/features/bill-split/types';
import { toBaht } from '@/shared/lib/currency';
import { getBillPayee } from './payee-service';

export type BillQRResult =
  | { ok: true; payload: string; accountName: string; amountSatang: number }
  | { ok: false; status: number; error: string };

/**
 * สร้าง QR ของ "คนหนึ่งคนในบิลหนึ่งใบ"
 *
 * ยอดคำนวณจากข้อมูลบิลฝั่ง server เสมอ ไม่รับยอดที่ client ส่งมา
 * ไม่งั้นผู้ใช้แก้ยอดในคำขอเพื่อสร้าง QR ที่จ่ายน้อยกว่าจริงได้
 */
export async function buildBillQR(bill: Bill, participantId: string): Promise<BillQRResult> {
  const person = bill.people.find((p) => p.id === participantId);
  if (!person) return { ok: false, status: 400, error: 'ไม่พบสมาชิกคนนี้ในบิล' };

  const split = calculateSplit(bill);
  const amountSatang = split.byPersonId[participantId]?.total ?? 0;
  if (amountSatang <= 0) return { ok: false, status: 400, error: 'คนนี้ไม่มียอดต้องชำระ' };

  const payee = await getBillPayee(bill.id);
  if (!payee) {
    return { ok: false, status: 409, error: 'บิลนี้ยังไม่มีข้อมูลบัญชีรับเงิน' };
  }

  try {
    const payload = generatePayload(payee.promptPayId, { amount: toBaht(amountSatang) });
    return { ok: true, payload, accountName: payee.accountName, amountSatang };
  } catch (error) {
    console.error('[qr] สร้าง payload ไม่สำเร็จ', error);
    return { ok: false, status: 500, error: 'สร้าง QR ไม่สำเร็จ' };
  }
}
