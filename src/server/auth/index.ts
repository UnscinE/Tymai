import 'server-only';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@/server/db';
import { authConfig, type AppToken } from './auth.config';

/**
 * Auth.js ตัวเต็ม — รันบน Node runtime เท่านั้น (มี Prisma + bcrypt)
 * middleware ห้าม import ไฟล์นี้ ให้ใช้ ./auth.config แทน
 */

const credentialsSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });

        // ผู้ใช้ที่สมัครด้วย Google จะไม่มี passwordHash — ห้ามให้ผ่านด้วยรหัสว่าง
        if (!user?.passwordHash) {
          // เปรียบเทียบ hash หลอกๆ เพื่อให้เวลาตอบเท่ากับกรณีรหัสผิด
          // ไม่งั้นผู้โจมตีวัดเวลาตอบเพื่อไล่ดูว่า email ไหนมีอยู่ในระบบได้
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }
        if (user.status !== 'ACTIVE') return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Google login: ค่า role/status ไม่ได้มาจาก authorize() จึงต้องอ่านจาก DB
     * ทำที่นี่ครั้งเดียวตอนสร้าง token ไม่ใช่ทุก request
     */
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params) as AppToken;
      if ((params.user || params.trigger === 'update') && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, status: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
        }
      }
      return token;
    },
  },
});

/** bcrypt hash ของสตริงสุ่ม ใช้เป็น dummy สำหรับหน่วงเวลาให้เท่ากัน */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO3aXk9tNfP0.SdE0v0lTJ2xWlWuC1zBK';
