import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma CLI อ่าน .env เป็นค่าเริ่มต้น แต่ Next.js ใช้ .env.local
// โหลด .env.local ให้ชัดเจน จะได้ไม่ต้องเก็บ connection string ไว้สองที่
loadEnv({ path: '.env.local', quiet: true });

/**
 * Config ของ Prisma CLI (migrate / introspect / studio)
 *
 * Supabase มีสอง connection string:
 *   DIRECT_URL   — port 5432 ต่อตรงกับ Postgres  → ใช้กับ migration (ต้องมี session แบบเต็ม)
 *   DATABASE_URL — port 6543 ผ่าน pooler (pgbouncer) → ใช้ตอน runtime ใน src/server/db.ts
 *
 * ห้ามสลับกัน: migration ผ่าน pgbouncer จะพังเพราะ prepared statement ใช้ไม่ได้ใน transaction mode
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
