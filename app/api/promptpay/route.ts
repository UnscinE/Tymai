import { NextResponse } from 'next/server';
import generatePayload from 'promptpay-qr';
import { serverEnv } from '@/shared/lib/env';
import { toBaht } from '@/shared/lib/currency';

export const runtime = 'nodejs';

/**
 * สร้าง PromptPay payload ฝั่ง server เพื่อไม่ให้เลข PromptPay ถูก inline ลง JS bundle
 * (ผู้จ่ายเห็นเลขนี้ตอนสแกนอยู่แล้ว แต่ไม่มีเหตุผลให้มันติดไปกับ bundle ของทุกหน้า)
 */
export async function POST(request: Request) {
  let body: { amountSatang?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const amountSatang = Number(body.amountSatang);
  if (!Number.isInteger(amountSatang) || amountSatang <= 0 || amountSatang > 200_000_00) {
    return NextResponse.json({ error: 'ยอดเงินไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const payload = generatePayload(serverEnv.promptPayId, { amount: toBaht(amountSatang) });
    return NextResponse.json(
      { payload, accountName: serverEnv.accountName },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[promptpay] สร้าง payload ไม่สำเร็จ', error);
    return NextResponse.json({ error: 'สร้าง QR ไม่สำเร็จ ตรวจสอบค่า PROMPTPAY_ID' }, { status: 500 });
  }
}
