import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireUser } from '@/server/guards';
import { getHistory, type HistoryFilter } from '@/server/services/history-service';
import { HistoryClient } from '@/features/bill-history';

export const metadata: Metadata = { title: 'ประวัติบิล · tymai' };
export const dynamic = 'force-dynamic';

const FILTERS: HistoryFilter[] = ['all', 'created', 'to-pay', 'settled'];

export default async function HistoryPage({ searchParams }: PageProps<'/history'>) {
  const user = await requireUser();
  const sp = await searchParams;

  const rawFilter = typeof sp.filter === 'string' ? sp.filter : 'all';
  const filter = (FILTERS as string[]).includes(rawFilter) ? (rawFilter as HistoryFilter) : 'all';
  const query = (typeof sp.q === 'string' ? sp.q : '').trim().slice(0, 80);

  const page = await getHistory({ userId: user.id, filter, query });

  return (
    // HistoryClient อ่าน useSearchParams จึงต้องอยู่ใน Suspense
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8"><div className="h-64 animate-pulse rounded-2xl bg-surface-alt" /></div>}>
      <HistoryClient initial={page} filter={filter} query={query} />
    </Suspense>
  );
}
