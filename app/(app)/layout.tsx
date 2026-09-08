import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireUser } from '@/server/guards';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { Badge } from '@/shared/components/ui/Badge';

/**
 * Shell ของโซนที่ต้อง login
 *
 * requireUser() ตรงนี้เป็นด่านที่สอง ถัดจาก middleware — จงใจซ้ำ
 * ถ้าวันหนึ่ง matcher ของ middleware มีช่องโหว่ หน้าพวกนี้ยังต้องไม่หลุด
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
          <Link href="/dashboard" className="font-bold tracking-tight text-brand">
            tymai
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/dashboard">หน้าหลัก</NavLink>
            <NavLink href="/bills/new">สร้างบิล</NavLink>
            <NavLink href="/friends">เพื่อน</NavLink>
            <NavLink href="/history">ประวัติ</NavLink>
            <NavLink href="/settings">ตั้งค่า</NavLink>
            {user.role === 'ADMIN' && <NavLink href="/admin">แอดมิน</NavLink>}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user.role === 'ADMIN' && <Badge tone="brand">ADMIN</Badge>}
            <span className="hidden text-sm text-ink-muted sm:inline">{user.name ?? user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-2.5 py-1.5 text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
    >
      {children}
    </Link>
  );
}
