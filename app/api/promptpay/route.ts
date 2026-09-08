import { NextResponse } from 'next/server';
import generatePayload from 'promptpay-qr';
import { getCurrentUser } from '@/server/guards';
import { getUserPayee } from '@/server/services/payee-service';
import { toBaht } from '@/shared/lib/currency';

export const runtime = 'nodejs';

const MAX_AMOUNT_SATANG = 200_000_00;

/**
 * สร้าง QR สำหรับ "บัญชีของตัวเอง" — ใช้ในหน้าพรีวิวตอนสร้างบิล
 *
 * ผู้ใช้สร้าง QR ให้บัญชีคนอื่นผ่าน endpoint นี้ไม่ได้ เลข PromptPay
 * ถูกดึงจากบัญชีที่ login อยู่เท่านั้น ไม่ได้รับมาจาก client
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let body: { amountSatang?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const amountSatang = Number(body.amountSatang);
  if (!Number.isInteger(amountSatang) || amountSatang <= 0 || amountSatang > MAX_AMOUNT_SATANG) {
    return NextResponse.json({ error: 'ยอดเงินไม่ถูกต้อง' }, { status: 400 });
  }

  const payee = await getUserPayee(user.id);
  if (!payee) {
    return NextResponse.json(
      { error: 'ยังไม่ได้ตั้งค่าเลข PromptPay', reason: 'no-payee' },
      { status: 409 },
    );
  }

  try {
    const payload = generatePayload(payee.promptPayId, { amount: toBaht(amountSatang) });
    return NextResponse.json(
      { payload, accountName: payee.accountName },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[promptpay] สร้าง payload ไม่สำเร็จ', error);
    return NextResponse.json({ error: 'สร้าง QR ไม่สำเร็จ ตรวจสอบเลข PromptPay' }, { status: 500 });
  }
}
