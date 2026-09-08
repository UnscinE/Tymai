import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/shared/components/ui/Button';

export const metadata: Metadata = { title: 'ไม่มีสิทธิ์เข้าถึง · tymai' };

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div className="max-w-sm space-y-3">
        <p className="text-5xl">🔒</p>
        <h1 className="text-xl font-bold text-ink">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="text-sm text-ink-muted">
          หน้านี้สงวนไว้สำหรับผู้ดูแลระบบเท่านั้น ถ้าคิดว่าเป็นความผิดพลาด ติดต่อผู้ดูแลระบบได้เลย
        </p>
        <Link href="/dashboard" className="inline-block pt-2">
          <Button variant="secondary">กลับหน้าหลัก</Button>
        </Link>
      </div>
    </main>
  );
}
