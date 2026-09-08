import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'เข้าสู่ระบบ · tymai' };

export default function LoginPage() {
  // LoginForm อ่าน callbackUrl จาก useSearchParams จึงต้องอยู่ใน Suspense
  // ไม่งั้น Next จะ error ตอน prerender หน้านี้เป็น static
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-alt" />}>
      <LoginForm />
    </Suspense>
  );
}
