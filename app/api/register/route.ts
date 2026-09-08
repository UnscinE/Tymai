import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(60),
  email: z.email('อีเมลไม่ถูกต้อง').transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
    .max(72, 'รหัสผ่านยาวเกินไป'), // bcrypt ตัดที่ 72 bytes อยู่แล้ว
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // บอกตรงๆ ว่าอีเมลนี้ถูกใช้แล้ว — ปกปิดตรงนี้ไม่ได้ช่วยอะไร
    // เพราะหน้าสมัครสมาชิกยังไงก็ต้องกันอีเมลซ้ำ และผู้ใช้ต้องรู้ว่าให้ไปกด login แทน
    return NextResponse.json(
      { error: 'อีเมลนี้ถูกใช้สมัครแล้ว กรุณาเข้าสู่ระบบแทน' },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { name, email, passwordHash },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
