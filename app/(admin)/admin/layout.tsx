import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/server/guards';
import { Badge } from '@/shared/components/ui/Badge';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { ShellNav } from '@/shared/components/navigation/ShellNav';

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
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink text-white shadow-lg shadow-ink/10">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-3 py-2 md:gap-5 md:px-6">
          <Link href="/admin" className="shrink-0 rounded-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            tymai <span className="text-white/50">admin</span>
          </Link>

          <ShellNav
            dark
            items={[
              { href: '/admin', label: 'ภาพรวม', icon: 'chart' },
              { href: '/admin/users', label: 'ผู้ใช้', icon: 'users' },
              { href: '/admin/bills', label: 'บิล', icon: 'fileText' },
              { href: '/admin/audit', label: 'Audit log', icon: 'clipboard' },
            ]}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Badge tone="brand">ADMIN</Badge>
            <Link
              href="/dashboard"
              className="hidden rounded-lg px-2.5 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
            >
              กลับหน้าผู้ใช้
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <p className="border-b border-warning/20 bg-warning-soft px-4 py-2.5 text-center text-xs leading-5 text-warning-ink">
        คุณกำลังดูข้อมูลของผู้ใช้ทุกคนในระบบ — ทุกการกระทำในหน้านี้ถูกบันทึกลง audit log
        พร้อมชื่อของคุณ ({user.email})
      </p>

      {children}
    </div>
  );
}
