import Link from 'next/link';
import type { ReactNode } from 'react';
import { auth } from '@/server/auth';
import { Button } from '@/shared/components/ui/Button';

/** Shell สาธารณะ — ปุ่มมุมขวาเปลี่ยนตามว่า login อยู่หรือยัง */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-brand">
            tymai
          </Link>

          <nav className="ml-4 hidden items-center gap-1 text-sm sm:flex">
            <NavLink href="/#how-it-works">วิธีใช้งาน</NavLink>
            <NavLink href="/#features">ความสามารถ</NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="sm">เข้าแอป</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost">
                    เข้าสู่ระบบ
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">เริ่มใช้ฟรี</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-xs text-ink-faint md:px-6">
          <span className="font-semibold text-ink-muted">tymai</span>
          <span>หารค่าอาหาร · PromptPay QR · ตรวจสลิปอัตโนมัติ</span>
          <span className="ml-auto">
            ระบบไม่ได้เป็นตัวกลางรับเงิน เงินโอนเข้าบัญชีผู้รับโดยตรง
          </span>
        </div>
      </footer>
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
