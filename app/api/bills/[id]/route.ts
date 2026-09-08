import { NextResponse } from 'next/server';
import { getBill, isBillOwner, updateBill } from '@/server/bill-store';
import { releaseSlipFingerprint } from '@/server/bill-store';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const bill = await getBill(id);
  if (!bill) return NextResponse.json({ error: 'ไม่พบบิลนี้ อาจหมดอายุแล้ว' }, { status: 404 });
  return NextResponse.json({ bill }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * เจ้าของบิลติ๊ก/ยกเลิกสถานะจ่ายเงินด้วยมือ (เช่น เพื่อนโอนเงินสดให้)
 * ต้องแนบ ownerToken ผ่าน header — โทเคนนี้ถูกเก็บใน localStorage ของเจ้าของเท่านั้น
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const token = request.headers.get('x-owner-token');

  if (!(await isBillOwner(id, token))) {
    return NextResponse.json({ error: 'ต้องเป็นเจ้าของบิลเท่านั้น' }, { status: 403 });
  }

  let body: { personId?: string; status?: 'paid' | 'unpaid' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const personId = typeof body.personId === 'string' ? body.personId : '';
  const status = body.status === 'paid' || body.status === 'unpaid' ? body.status : null;
  if (!personId || !status) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const current = await getBill(id);
  if (!current) return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });
  if (!current.people.some((p) => p.id === personId)) {
    return NextResponse.json({ error: 'ไม่พบสมาชิกคนนี้ในบิล' }, { status: 400 });
  }

  // ถ้ายกเลิกสถานะที่เคยยืนยันด้วยสลิป ต้องคืน fingerprint ให้ใช้ซ้ำได้
  const previous = current.payments[personId];
  if (status === 'unpaid' && previous?.slipFingerprint) {
    await releaseSlipFingerprint(previous.slipFingerprint);
  }

  const bill = await updateBill(id, (b) => ({
    ...b,
    payments: {
      ...b.payments,
      [personId]:
        status === 'paid'
          ? { status: 'paid', paidAt: new Date().toISOString(), manual: true }
          : { status: 'unpaid' },
    },
  }));

  return NextResponse.json({ bill }, { headers: { 'Cache-Control': 'no-store' } });
}
