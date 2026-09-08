import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center">
          <span className="text-lg font-bold tracking-tight text-brand">tymai</span>
          <span className="mt-0.5 block text-xs text-ink-faint">หารค่าอาหาร ไม่ต้องทวงกันเอง</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
