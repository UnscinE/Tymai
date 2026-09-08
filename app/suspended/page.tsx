import type { Metadata } from 'next';
import { SignOutButton } from '@/features/auth/components/SignOutButton';

export const metadata: Metadata = { title: 'บัญชีถูกระงับ · tymai' };

export default function SuspendedPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div className="max-w-sm space-y-3">
        <p className="text-5xl">⛔</p>
        <h1 className="text-xl font-bold text-ink">บัญชีนี้ถูกระงับการใช้งาน</h1>
        <p className="text-sm text-ink-muted">
          บิลและประวัติของคุณยังอยู่ครบ แต่ใช้งานต่อไม่ได้จนกว่าผู้ดูแลระบบจะคืนสิทธิ์
        </p>
        <div className="pt-2">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
