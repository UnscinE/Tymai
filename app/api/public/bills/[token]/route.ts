import { NextResponse } from 'next/server';
import { getBillByPublicToken } from '@/server/services/bill-service';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ token: string }> };

/** อ่านบิลผ่านลิงก์สาธารณะ — เพื่อนที่ไม่มีบัญชีใช้ทางนี้ ตัวโทเคนเองคือกุญแจ */
export async function GET(_request: Request, { params }: Ctx) {
  const { token } = await params;
  const bill = await getBillByPublicToken(token);
  if (!bill) return NextResponse.json({ error: 'ไม่พบบิลนี้ อาจหมดอายุแล้ว' }, { status: 404 });
  return NextResponse.json({ bill }, { headers: { 'Cache-Control': 'no-store' } });
}
