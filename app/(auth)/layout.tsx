import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-7 block text-center">
          <span className="inline-block rounded-2xl border border-white/80 bg-white/75 px-4 py-2 text-lg font-bold tracking-tight text-brand shadow-sm">tymai</span>
          <span className="mt-0.5 block text-xs text-ink-faint">หารค่าอาหาร ไม่ต้องทวงกันเอง</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
