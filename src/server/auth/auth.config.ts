import type { UserRole, UserStatus } from '@prisma/client';
import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';

/**
 * ส่วนของ Auth.js ที่ "รันบน Edge Runtime ได้"
 *
 * middleware.ts ของ Next.js รันบน Edge ซึ่ง import Prisma / bcrypt ไม่ได้
 * ไฟล์นี้จึงต้องไม่แตะ @/server/db, ไม่ import bcryptjs และไม่มี adapter
 * (import type จาก @prisma/client ใช้ได้ เพราะ type ถูกลบทิ้งตอน compile ไม่เหลือโค้ดจริง)
 *
 * ผลพลอยได้: middleware ตัดสินใจได้จาก JWT อย่างเดียว ไม่ต้อง query DB ทุก request
 */

/**
 * next-auth/jwt เป็นแค่ re-export ของ @auth/core/jwt การ `declare module 'next-auth/jwt'`
 * จึงไม่ merge เข้ากับ interface JWT ตัวจริง (และ @auth/core ก็ไม่ได้อยู่ top-level ใน pnpm)
 * เลยประกาศ type ของ token เองแล้ว cast ที่ขอบ callback แทน — ชัดเจนกว่าและไม่ต้องพึ่ง hoisting
 */
export type AppToken = JWT & {
  id: string;
  role: UserRole;
  status: UserStatus;
  refreshedAt?: number;
};

export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },

  // Google อยู่ตรงนี้ได้เพราะเป็น OAuth ล้วน ไม่แตะ DB ตอน redirect
  providers: [
    Google({
      // ผูกกับบัญชี email/password เดิมที่อีเมลตรงกัน แทนที่จะสร้างบัญชีซ้ำ
      // ปลอดภัยเพราะ Google ยืนยันอีเมลให้แล้ว
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  // ต้องเป็น 'jwt' — ถ้าใช้ 'database' middleware จะอ่าน session ไม่ได้บน Edge
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },

  callbacks: {
    jwt({ token, user, trigger }) {
      const t = token as AppToken;

      // ตอน login ครั้งแรกเท่านั้นที่มี user — ยัด id/role/status ลง token
      if (user) {
        t.id = user.id ?? t.sub ?? '';
        t.role = user.role ?? 'USER';
        t.status = user.status ?? 'ACTIVE';
      }

      // เมื่อแอดมินเปลี่ยน role หรือระงับบัญชี ให้ฝั่ง client เรียก useSession().update()
      // เพื่อบังคับให้รอบถัดไปดึงค่าใหม่จาก DB (ทำต่อใน callbacks ของ ./index.ts)
      if (trigger === 'update') t.refreshedAt = Date.now();

      return t;
    },

    session({ session, token }) {
      const t = token as AppToken;
      if (session.user) {
        session.user.id = t.id;
        session.user.role = t.role;
        session.user.status = t.status;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
