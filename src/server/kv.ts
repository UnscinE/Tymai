import 'server-only';
import { Redis } from '@upstash/redis';
import { serverEnv } from '@/shared/lib/env';

/**
 * ชั้นเก็บข้อมูลแบบ key-value
 * - production: Upstash Redis (Vercel KV ใช้ตัวเดียวกันได้ ตั้ง env 2 ตัวเดียวกัน)
 * - dev ที่ยังไม่ตั้ง env: fallback เป็นไฟล์ .bill-store.json บนดิสก์ (ไม่มี TTL จริง)
 */
export interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** คืน true ถ้าเซ็ตสำเร็จ (คือ key ยังไม่เคยมี) — ใช้กันสลิปซ้ำแบบ atomic */
  setIfAbsent<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<void>;
}

class UpstashStore implements KVStore {
  private redis: Redis;
  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }
  async get<T>(key: string) {
    return (await this.redis.get<T>(key)) ?? null;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    await this.redis.set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined);
  }
  async setIfAbsent<T>(key: string, value: T, ttlSeconds?: number) {
    const res = await this.redis.set(key, value, ttlSeconds ? { nx: true, ex: ttlSeconds } : { nx: true });
    return res === 'OK';
  }
  async del(key: string) {
    await this.redis.del(key);
  }
}

type FileRow = { value: unknown; expiresAt: number | null };

class FileStore implements KVStore {
  private file = `${process.cwd()}/.bill-store.json`;
  private queue: Promise<unknown> = Promise.resolve();

  private async readAll(): Promise<Record<string, FileRow>> {
    const fs = await import('node:fs/promises');
    try {
      return JSON.parse(await fs.readFile(this.file, 'utf8')) as Record<string, FileRow>;
    } catch {
      return {};
    }
  }

  private async writeAll(data: Record<string, FileRow>) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(this.file, JSON.stringify(data, null, 2), 'utf8');
  }

  /** ทำงานทีละคิว กันสองรีเควสต์เขียนทับกันตอน dev */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async get<T>(key: string) {
    const all = await this.readAll();
    const row = all[key];
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < Date.now()) return null;
    return row.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number) {
    await this.serialize(async () => {
      const all = await this.readAll();
      all[key] = { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null };
      await this.writeAll(all);
    });
  }

  async setIfAbsent<T>(key: string, value: T, ttlSeconds?: number) {
    return this.serialize(async () => {
      const all = await this.readAll();
      const row = all[key];
      const alive = row && (!row.expiresAt || row.expiresAt > Date.now());
      if (alive) return false;
      all[key] = { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null };
      await this.writeAll(all);
      return true;
    });
  }

  async del(key: string) {
    await this.serialize(async () => {
      const all = await this.readAll();
      delete all[key];
      await this.writeAll(all);
    });
  }
}

let store: KVStore | null = null;

export function getKV(): KVStore {
  if (store) return store;
  const url = serverEnv.upstashUrl;
  const token = serverEnv.upstashToken;
  if (url && token) {
    store = new UpstashStore(url, token);
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[kv] production ต้องตั้ง UPSTASH_REDIS_REST_URL และ UPSTASH_REDIS_REST_TOKEN',
      );
    }
    console.warn('[kv] ไม่พบ Upstash env — ใช้ไฟล์ .bill-store.json สำหรับ dev แทน');
    store = new FileStore();
  }
  return store;
}

export const isUsingRemoteStore = () => Boolean(serverEnv.upstashUrl && serverEnv.upstashToken);
