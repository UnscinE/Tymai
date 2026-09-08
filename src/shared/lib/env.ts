import 'server-only';

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[env] ขาดค่า ${key} — กรุณาตั้งค่าใน .env.local (ดูตัวอย่างที่ .env.example)`,
    );
  }
  return value;
}

export const serverEnv = {
  get promptPayId() {
    return required('PROMPTPAY_ID');
  },
  get accountName() {
    return process.env.ACCOUNT_NAME ?? 'ผู้รับเงิน';
  },
  get upstashUrl() {
    return process.env.UPSTASH_REDIS_REST_URL ?? '';
  },
  get upstashToken() {
    return process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
  },
};
