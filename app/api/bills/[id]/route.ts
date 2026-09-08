import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentUser } from '@/server/guards';
import { getBill, setParticipantStatus } from '@/server/services/bill-service';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** อ่านบิล — เจ้าของบิล หรือคนที่อยู่ในบิลนั้น (ที่มีบัญชี) เท่านั้น */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  const bill = await getBill(id, user.id);
  if (!bill) return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });

  if (!bill.isCreator && !(await isParticipant(id, user.id)) && user.role !== 'ADMIN') {
    // ตอบ 404 เหมือนกรณีไม่มีบิล ไม่งั้นคนนอกไล่เดา id เพื่อดูว่าบิลไหนมีอยู่จริงได้
    return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });
  }

  return NextResponse.json({ bill }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * เจ้าของบิลติ๊ก/ยกเลิกสถานะจ่ายเงินด้วยมือ (เช่น เพื่อนโอนเงินสดให้)
 * เดิมใช้ header x-owner-token — ตอนนี้ตรวจจาก session + Bill.creatorId แทน
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  const bill = await db.bill.findUnique({ where: { id }, select: { creatorId: true } });
  if (!bill) return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });
  if (bill.creatorId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });
  }

  let body: { personId?: string; status?: 'paid' | 'unpaid' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const personId = typeof body.personId === 'string' ? body.personId : '';
  const status = body.status === 'paid' || body.status === 'unpaid' ? body.status : null;
  if (!personId || !status) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });

  const updated = await setParticipantStatus({
    billId: id,
    participantId: personId,
    paid: status === 'paid',
    actorId: user.id,
  });
  if (!updated) return NextResponse.json({ error: 'ไม่พบสมาชิกคนนี้ในบิล' }, { status: 400 });

  return NextResponse.json({ bill: updated }, { headers: { 'Cache-Control': 'no-store' } });
}

async function isParticipant(billId: string, userId: string) {
  const row = await db.billParticipant.findFirst({
    where: { billId, userId },
    select: { id: true },
  });
  return Boolean(row);
}
