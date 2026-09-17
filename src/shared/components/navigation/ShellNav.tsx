'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, ContactRound, FilePlus2, FileText, History, Settings2, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const ICONS = {
    chart: BarChart3,
    contacts: ContactRound,
    filePlus: FilePlus2,
    fileText: FileText,
    history: History,
    settings: Settings2,
    shield: ShieldCheck,
    clipboard: ClipboardList,
    users: Users,
} as const;

type NavItem = {
    href: string;
    label: ReactNode;
    icon: keyof typeof ICONS;
};

export function ShellNav({ items, dark = false }: { items: NavItem[]; dark?: boolean }) {
    const pathname = usePathname();

    return (
        <nav aria-label="เมนูหลัก" className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex w-max items-center gap-1 px-1 py-1 text-sm">
                {items.map(({ href, label, icon }) => {
                    const Icon = ICONS[icon];
                    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 transition-[background-color,color,box-shadow,transform] duration-150',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                                'active:scale-[0.98]',
                                dark
                                    ? active
                                        ? 'bg-white/15 text-white shadow-sm'
                                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                                    : active
                                        ? 'bg-brand-soft text-brand-dark shadow-sm'
                                        : 'text-ink-muted hover:bg-surface-alt hover:text-ink',
                            )}
                        >
                            <Icon size={16} strokeWidth={active ? 2.2 : 1.8} aria-hidden={true} />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
