import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/guards';
import { createBill } from '@/server/services/bill-service';
import { sanitizeDraft } from '@/server/services/sanitize-draft';
import { getUserPayee } from '@/server/services/payee-service';

export const runtime = 'nodejs';

/** สร้างบิลใหม่ — ต้อง login เพราะบิลผูกกับ creatorId ไม่ใช่ ownerToken ใน localStorage อีกแล้ว */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const draft = sanitizeDraft(body);
  if (!draft) return NextResponse.json({ error: 'ข้อมูลบิลไม่ถูกต้อง' }, { status: 400 });
  if (draft.people.length === 0) {
    return NextResponse.json({ error: 'ต้องมีสมาชิกอย่างน้อย 1 คน' }, { status: 400 });
  }
  if (draft.items.length === 0) {
    return NextResponse.json({ error: 'ต้องมีรายการอาหารอย่างน้อย 1 รายการ' }, { status: 400 });
  }

  // ต้องมีบัญชีรับเงินก่อน ไม่งั้นสร้างบิลไปก็ไม่มี QR ให้เพื่อนสแกน
  const payee = await getUserPayee(user.id);
  if (!payee) {
    return NextResponse.json(
      { error: 'กรุณาตั้งค่าเลข PromptPay ที่หน้าตั้งค่าก่อนสร้างบิล', reason: 'no-payee' },
      { status: 409 },
    );
  }

  const bill = await createBill({ creatorId: user.id, draft, payee });

  return NextResponse.json({ bill }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
