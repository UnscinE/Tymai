import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client แบบ singleton + lazy
 *
 * lazy สำคัญมาก: ตอน `next build` Next จะ import ทุก route เพื่อเก็บ config
 * ถ้าสร้าง client ตอน import ทันที build จะพังทั้งกระบวนบนเครื่อง CI ที่ไม่มี DATABASE_URL
 * จึงสร้างจริงตอนมีคนเรียกใช้ครั้งแรกเท่านั้น
 *
 * singleton สำคัญตอน dev: Next hot-reload โมดูลใหม่ทุกครั้งที่แก้ไฟล์
 * ถ้าสร้าง PrismaClient ใหม่ทุกรอบ connection pool ของ Supabase (free tier จำกัดต่ำมาก)
 * จะเต็มภายในไม่กี่นาที
 *
 * Prisma 7 ไม่อ่าน url จาก schema แล้ว ต้องส่ง driver adapter เข้ามาเอง
 * ใช้ DATABASE_URL (pooler port 6543 ของ Supabase) เพราะ serverless เปิด connection ถี่มาก
 * ส่วน migration ใช้ DIRECT_URL ผ่าน prisma.config.ts
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('[db] ขาดค่า DATABASE_URL — ดูวิธีตั้งค่าที่ .env.example');
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // production ก็ cache ได้ ไม่มีผลเสีย และช่วยกรณี lambda ถูก reuse
  globalForPrisma.prisma = client;
  return client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    // bind กลับไปที่ client ตัวจริง ไม่งั้น method ที่ใช้ `this` ภายในจะพัง
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
