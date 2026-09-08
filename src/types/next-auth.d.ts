import type { UserRole, UserStatus } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

/**
 * ขยาย type ของ Auth.js ให้รู้จัก role/status ที่เราใส่เพิ่มเข้าไป
 * ถ้าไม่มีไฟล์นี้ session.user.role จะเป็น type error ทุกที่ที่เรียกใช้
 *
 * หมายเหตุ: JWT ขยายตรงนี้ไม่ได้ (next-auth/jwt เป็นแค่ re-export ของ @auth/core/jwt)
 * ดู type AppToken ใน src/server/auth/auth.config.ts แทน
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
  }
}

export {};
