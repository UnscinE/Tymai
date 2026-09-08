import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import { getBill } from '@/server/services/bill-service';
import { canUploadFor, intakeSlip, readSlipBody } from '@/server/services/slip-intake';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** อัปโหลดสลิปจากในแอป (ต้อง login) — client อ่าน QR เองแล้วส่งมาแค่ payload */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ reason: 'unauthorized', error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ reason: 'unknown', error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const body = readSlipBody(raw);
  if (!body) return NextResponse.json({ reason: 'unknown', error: 'ข้อมูลไม่ครบ' }, { status: 400 });

  const bill = await getBill(id, user.id);
  if (!bill) return NextResponse.json({ reason: 'bill-not-found', error: 'ไม่พบบิลนี้' }, { status: 404 });

  const allowed = await canUploadFor({
    billId: id,
    participantId: body.personId,
    userId: user.id,
    isCreator: Boolean(bill.isCreator),
  });
  if (!allowed) {
    return NextResponse.json(
      { reason: 'unknown', error: 'อัปโหลดสลิปได้เฉพาะรายการของตัวเอง' },
      { status: 403 },
    );
  }

  const result = await intakeSlip({ bill, participantId: body.personId, payload: body.payload });
  if (!result.ok) {
    return NextResponse.json({ reason: result.reason, error: result.message }, { status: result.status });
  }

  return NextResponse.json(
    { bill: result.bill, alreadyPaid: result.alreadyPaid },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
