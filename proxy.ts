import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/server/auth/auth.config';

/**
 * ประตูหน้าบ้าน — รันบน Edge Runtime ก่อนทุก request
 *
 * Next.js 16 เปลี่ยนชื่อ convention จาก middleware.ts เป็น proxy.ts แล้ว
 * (middleware.ts ยังใช้ได้แต่ขึ้น deprecation warning ตอน build)
 *
 * ตรวจได้เฉพาะสิ่งที่อยู่ใน JWT (login แล้วหรือยัง / role อะไร) เพราะ Prisma รันบน Edge ไม่ได้
 * คำถามระดับ "คนนี้เป็นเจ้าของบิลใบนี้ไหม" ต้องไปตรวจใน server guard (src/server/guards.ts)
 *
 * middleware = ประตูหน้าบ้าน / guards = กุญแจแต่ละห้อง ต้องมีทั้งคู่
 */
const { auth } = NextAuth(authConfig);

/** เปิดให้ทุกคน ไม่ต้อง login */
const PUBLIC_ROUTES = ['/', '/pricing', '/privacy', '/terms', '/forbidden', '/suspended'];

/** หน้า login/register — ถ้า login อยู่แล้วให้เด้งเข้าแอป */
const AUTH_ROUTES = ['/login', '/register'];

/**
 * prefix ที่เปิดสาธารณะ
 * - /b/ คือลิงก์บิลที่ส่งให้เพื่อน ต้องเปิดได้โดยไม่ต้องมีบัญชี
 * - /api/public/ คือ API ที่หน้านั้นเรียกใช้ (สิทธิ์มาจากโทเคนในลิงก์ ไม่ใช่ session)
 * - /api/promptpay สร้าง QR ให้ทั้งคนที่ login และไม่ login
 *
 * หมายเหตุ: /api/bills ไม่อยู่ในนี้แล้ว เพราะตั้งแต่ย้ายมาใช้ Prisma
 * การสร้าง/อ่าน/แก้บิลต้องมี session เสมอ
 */
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/public/',
  '/api/promptpay',
  '/api/register',
  '/b/',
];

const ADMIN_PREFIXES = ['/admin', '/api/admin'];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = Boolean(session?.user);
  const role = session?.user?.role;
  const status = session?.user?.status;
  const isApi = pathname.startsWith('/api/');

  // 1. บัญชีถูกระงับ → เตะออกทุกหน้า ยกเว้นหน้าที่บอกว่าโดนระงับ
  if (isLoggedIn && status !== 'ACTIVE' && pathname !== '/suspended') {
    if (isApi) return NextResponse.json({ error: 'บัญชีถูกระงับการใช้งาน' }, { status: 403 });
    return NextResponse.redirect(new URL('/suspended', req.nextUrl));
  }

  // 2. login แล้วยังเข้าหน้า login/register อยู่ → เด้งเข้าแอป
  if (AUTH_ROUTES.includes(pathname)) {
    return isLoggedIn
      ? NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      : NextResponse.next();
  }

  // 3. หน้าสาธารณะ ผ่านได้เลย
  if (PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 4. ยังไม่ login → ส่งไปหน้า login พร้อมจำปลายทางไว้
  if (!isLoggedIn) {
    // API ตอบ JSON ไม่ redirect ไม่งั้น fetch ฝั่ง client จะได้ HTML มาแล้ว parse พัง
    if (isApi) return NextResponse.json({ error: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 });

    const login = new URL('/login', req.nextUrl);
    login.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // 5. โซนแอดมิน → ต้องเป็น ADMIN เท่านั้น
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p)) && role !== 'ADMIN') {
    if (isApi) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    // ส่งไป /forbidden ไม่ใช่ 404 — ผู้ใช้ควรรู้ว่าหน้ามีอยู่แต่ตัวเองเข้าไม่ได้
    return NextResponse.redirect(new URL('/forbidden', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // ครอบทุก path ยกเว้นไฟล์ static และรูป
    // ถ้าปล่อยให้ middleware วิ่งทับ _next/static ทุก asset จะช้าโดยไม่จำเป็น
    '/((?!_next/static|_next/image|favicon.ico|qr-logos|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)',
  ],
};
