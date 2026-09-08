import { NextResponse } from 'next/server';
import { getBill, updateBill } from '@/server/bill-store';
import { verifySlip } from '@/features/slip-verification/lib/verify-slip.server';
import { fingerprintPayload } from '@/features/slip-verification/lib/slip-payload';
import { calculateSplit } from '@/features/bill-split/lib/calculate-split';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** เพื่อนอัปโหลดสลิป: client อ่าน QR ได้แล้วส่ง payload มาให้ server ตรวจ */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;

  let body: { personId?: string; payload?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const personId = typeof body.personId === 'string' ? body.personId : '';
  const payload = typeof body.payload === 'string' ? body.payload.trim() : '';
  if (!personId || !payload || payload.length > 512) {
    return NextResponse.json({ reason: 'unknown', error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const bill = await getBill(id);
  if (!bill) {
    return NextResponse.json({ reason: 'bill-not-found', error: 'ไม่พบบิลนี้' }, { status: 404 });
  }
  if (!bill.people.some((p) => p.id === personId)) {
    return NextResponse.json({ reason: 'unknown', error: 'ไม่พบสมาชิกคนนี้ในบิล' }, { status: 400 });
  }
  if (bill.payments[personId]?.status === 'paid') {
    return NextResponse.json({ bill, alreadyPaid: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // คำนวณยอดฝั่ง server เสมอ ไม่รับยอดที่ client ส่งมา
  const split = calculateSplit(bill);
  const expectedAmount = split.byPersonId[personId]?.total ?? 0;

  const fingerprint = await fingerprintPayload(payload);
  const result = await verifySlip({ billId: id, personId, payload, fingerprint, expectedAmount });

  if (!result.ok) {
    return NextResponse.json({ reason: result.reason, error: result.message }, { status: 409 });
  }

  const updated = await updateBill(id, (b) => ({
    ...b,
    payments: {
      ...b.payments,
      [personId]: {
        status: 'paid',
        slipFingerprint: fingerprint,
        slipRef: result.transRef,
        paidAt: new Date().toISOString(),
      },
    },
  }));

  return NextResponse.json({ bill: updated }, { headers: { 'Cache-Control': 'no-store' } });
}
