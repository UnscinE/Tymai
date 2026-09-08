import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/server/guards';
import { Badge } from '@/shared/components/ui/Badge';
import { SignOutButton } from '@/features/auth/components/SignOutButton';

/**
 * Shell ของโซนแอดมิน
 *
 * requireAdmin() ตรงนี้เป็นด่านที่สอง ถัดจาก proxy.ts — จงใจซ้ำ
 * proxy.ts อ่านแค่ role จาก JWT ซึ่งอาจค้างอยู่ 30 วันหลังถูกถอดสิทธิ์
 * ส่วน requireAdmin() ตรวจกับฐานข้อมูลจริงทุกครั้ง
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
          <Link href="/admin" className="font-bold tracking-tight">
            tymai <span className="text-white/50">admin</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <AdminLink href="/admin">ภาพรวม</AdminLink>
            <AdminLink href="/admin/users">ผู้ใช้</AdminLink>
            <AdminLink href="/admin/bills">บิล</AdminLink>
            <AdminLink href="/admin/audit">Audit log</AdminLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Badge tone="brand">ADMIN</Badge>
            <Link
              href="/dashboard"
              className="rounded-lg px-2.5 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              กลับหน้าผู้ใช้
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <p className="bg-warning-soft px-4 py-2 text-center text-xs text-warning-ink">
        คุณกำลังดูข้อมูลของผู้ใช้ทุกคนในระบบ — ทุกการกระทำในหน้านี้ถูกบันทึกลง audit log
        พร้อมชื่อของคุณ ({user.email})
      </p>

      {children}
    </div>
  );
}

function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-2.5 py-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}
