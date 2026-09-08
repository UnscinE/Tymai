import { NextResponse } from 'next/server';
import { getBillByPublicToken } from '@/server/services/bill-service';
import { intakeSlip, readSlipBody } from '@/server/services/slip-intake';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ token: string }> };

/**
 * อัปโหลดสลิปผ่านลิงก์สาธารณะ — ไม่ต้อง login
 * สิทธิ์มาจากการถือโทเคนของบิล (เดาไม่ได้) เหมือนกับลิงก์ Google Docs แบบ "ใครมีลิงก์ก็เข้าได้"
 * ส่วนการกันสลิปซ้ำยังเป็นด่านเดียวกับทางที่ login มา
 */
export async function POST(request: Request, { params }: Ctx) {
  const { token } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ reason: 'unknown', error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const body = readSlipBody(raw);
  if (!body) return NextResponse.json({ reason: 'unknown', error: 'ข้อมูลไม่ครบ' }, { status: 400 });

  const bill = await getBillByPublicToken(token);
  if (!bill) return NextResponse.json({ reason: 'bill-not-found', error: 'ไม่พบบิลนี้' }, { status: 404 });

  const result = await intakeSlip({ bill, participantId: body.personId, payload: body.payload });
  if (!result.ok) {
    return NextResponse.json({ reason: result.reason, error: result.message }, { status: result.status });
  }

  return NextResponse.json(
    { bill: result.bill, alreadyPaid: result.alreadyPaid },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
