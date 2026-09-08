import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentUser } from '@/server/guards';
import { getBill } from '@/server/services/bill-service';
import { buildBillQR } from '@/server/services/qr-service';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** QR ของคนในบิล สำหรับผู้ใช้ที่ login แล้ว (เจ้าของบิล หรือคนที่อยู่ในบิล) */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let body: { personId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }
  if (typeof body.personId !== 'string') {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const bill = await getBill(id, user.id);
  if (!bill) return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });

  const allowed =
    bill.isCreator ||
    user.role === 'ADMIN' ||
    Boolean(await db.billParticipant.findFirst({ where: { billId: id, userId: user.id }, select: { id: true } }));
  if (!allowed) return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });

  const result = await buildBillQR(bill, body.personId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(
    { payload: result.payload, accountName: result.accountName },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
