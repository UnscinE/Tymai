import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireUser } from '@/server/guards';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { Badge } from '@/shared/components/ui/Badge';
import { ShellNav } from '@/shared/components/navigation/ShellNav';

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
      <header className="sticky top-0 z-20 border-b border-line/80 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-3 py-2 md:gap-5 md:px-6">
          <Link href="/dashboard" className="shrink-0 rounded-lg font-bold tracking-tight text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <span className="text-lg">tymai</span>
          </Link>

          <ShellNav
            items={[
              { href: '/dashboard', label: 'หน้าหลัก', icon: 'chart' },
              { href: '/bills/new', label: 'สร้างบิล', icon: 'filePlus' },
              { href: '/friends', label: 'เพื่อน', icon: 'contacts' },
              { href: '/history', label: 'ประวัติ', icon: 'history' },
              { href: '/settings', label: 'ตั้งค่า', icon: 'settings' },
              ...(user.role === 'ADMIN' ? [{ href: '/admin', label: 'แอดมิน', icon: 'shield' as const }] : []),
            ]}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {user.role === 'ADMIN' && <Badge tone="brand">ADMIN</Badge>}
            <span className="hidden max-w-36 truncate text-sm text-ink-muted lg:inline">{user.name ?? user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
