import { NextResponse } from 'next/server';
import { getBillByPublicToken } from '@/server/services/bill-service';
import { buildBillQR } from '@/server/services/qr-service';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ token: string }> };

/** QR ของคนในบิล สำหรับเพื่อนที่เปิดจากลิงก์ — สิทธิ์มาจากโทเคน */
export async function POST(request: Request, { params }: Ctx) {
  const { token } = await params;

  let body: { personId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }
  if (typeof body.personId !== 'string') {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const bill = await getBillByPublicToken(token);
  if (!bill) return NextResponse.json({ error: 'ไม่พบบิลนี้' }, { status: 404 });

  const result = await buildBillQR(bill, body.personId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(
    { payload: result.payload, accountName: result.accountName },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
