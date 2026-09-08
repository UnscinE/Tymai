import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import {
  clearUserPayee,
  getUserPayeeMasked,
  maskPromptPayId,
  normalizePromptPayId,
  setUserPayee,
} from '@/server/services/payee-service';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });
  return NextResponse.json({ payee: await getUserPayeeMasked(user.id) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

/** ตั้งหรือแก้บัญชีรับเงินของตัวเอง — เลขถูกเข้ารหัสก่อนเก็บเสมอ */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let body: { promptPayId?: string; accountName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const promptPayId = normalizePromptPayId(String(body.promptPayId ?? ''));
  if (!promptPayId) {
    return NextResponse.json(
      { error: 'เลข PromptPay ต้องเป็นเบอร์โทร 10 หลัก เลขบัตรประชาชน 13 หลัก หรือ eWallet 15 หลัก' },
      { status: 400 },
    );
  }

  const accountName = String(body.accountName ?? '').trim();
  if (!accountName) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อบัญชีผู้รับเงิน' }, { status: 400 });
  }

  await setUserPayee(user.id, promptPayId, accountName);

  // คืนแค่เลขที่ปิดบังแล้ว ไม่ส่งเลขเต็มกลับไปให้ client เก็บไว้
  return NextResponse.json({ payee: { masked: maskPromptPayId(promptPayId), accountName } });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });
  await clearUserPayee(user.id);
  return NextResponse.json({ payee: null });
}
