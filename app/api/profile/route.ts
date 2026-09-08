import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { getCurrentUser } from '@/server/guards';

export const runtime = 'nodejs';

/**
 * username กับเบอร์โทรเป็นช่องทางที่เพื่อนใช้ค้นหาเรา
 * ทั้งคู่ unique ในฐานข้อมูล จึงต้องจัดการกรณีชนกันให้ผู้ใช้เข้าใจ
 */
const schema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,20}$/, 'username ใช้ได้เฉพาะ a-z 0-9 _ . ยาว 3-20 ตัว')
    .nullish()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => v === '' || /^\d{9,15}$/.test(v), 'เบอร์โทรไม่ถูกต้อง')
    .nullish()
    .or(z.literal('')),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' },
      { status: 400 },
    );
  }

  const { name } = parsed.data;
  // ช่องว่าง = ตั้งใจล้างค่า ต้องเก็บเป็น null ไม่ใช่ '' เพราะ '' จะชนกันเองใน unique index
  const username = parsed.data.username ? parsed.data.username : null;
  const phone = parsed.data.phone ? parsed.data.phone : null;

  try {
    const updated = await db.user.update({
      where: { id: user.id },
      data: { name, username, phone },
      select: { id: true, name: true, username: true, phone: true },
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    const target = (error as { code?: string; meta?: { target?: unknown } });
    if (target.code === 'P2002') {
      const field = String(target.meta?.target ?? '');
      return NextResponse.json(
        {
          error: field.includes('phone')
            ? 'เบอร์โทรนี้ถูกใช้กับบัญชีอื่นแล้ว'
            : 'username นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น',
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
