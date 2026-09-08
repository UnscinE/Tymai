'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { HistoryFilter, HistoryPage, HistoryRow } from '@/server/services/history-service';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/shared/lib/cn';
import { formatAmount } from '@/shared/lib/currency';
import { fadeUp, staggerList } from '@/shared/components/motion/variants';

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'created', label: 'บิลที่ฉันสร้าง' },
  { key: 'to-pay', label: 'บิลที่ฉันต้องจ่าย' },
  { key: 'settled', label: 'เสร็จสิ้นแล้ว' },
];

export function HistoryClient({
  initial,
  filter,
  query,
}: {
  initial: HistoryPage;
  filter: HistoryFilter;
  query: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [rows, setRows] = useState<HistoryRow[]>(initial.rows);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  const navigate = (next: { filter?: HistoryFilter; q?: string }) => {
    const sp = new URLSearchParams(params.toString());
    if (next.filter) sp.set('filter', next.filter);
    if (next.q !== undefined) {
      if (next.q) sp.set('q', next.q);
      else sp.delete('q');
    }
    router.push(`/history?${sp.toString()}`);
  };

  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams({ filter, cursor });
      if (query) sp.set('q', query);
      const res = await fetch(`/api/history?${sp.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as HistoryPage;
      setRows((prev) => [...prev, ...json.rows]);
      setCursor(json.nextCursor);
    } finally {
      setLoading(false);
    }
  };

  const { summary } = initial;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">ประวัติบิล</h1>
        <p className="mt-1 text-sm text-ink-muted">ย้อนดูได้ว่าครั้งไหนใครจ่ายเท่าไหร่</p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="บิลที่สร้างทั้งหมด" value={`${summary.createdCount}`} unit="ใบ" />
        <Stat label="เก็บได้แล้ว" value={formatAmount(summary.collectedSatang)} tone="success" />
        <Stat label="ยังค้างเก็บ" value={formatAmount(summary.outstandingSatang)} tone="warning" />
        <Stat label="ที่ฉันต้องจ่าย" value={formatAmount(summary.owedSatang)} tone="brand" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => navigate({ filter: f.key })}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95',
              filter === f.key
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-white text-ink-muted hover:border-brand/40 hover:text-brand',
            )}
          >
            {f.label}
          </button>
        ))}

        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: searchInput.trim() });
          }}
        >
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาชื่อบิล"
            className="w-44"
          />
          <Button type="submit" variant="secondary" size="md">
            ค้นหา
          </Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-sm text-ink-faint">
              {query
                ? `ไม่พบบิลที่ชื่อตรงกับ "${query}"`
                : filter === 'to-pay'
                  ? 'ยังไม่มีบิลที่ถูกเรียกเก็บจากคุณ — บิลจะมาที่นี่เมื่อเพื่อนเลือกคุณจากรายชื่อเพื่อนของเขา'
                  : 'ยังไม่มีบิลในหมวดนี้'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-2">
          <AnimatePresence mode="popLayout">
            {rows.map((row) => (
              <motion.li key={row.id} layout variants={fadeUp} exit="exit">
                <HistoryCard row={row} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {cursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'โหลดเพิ่ม'}
          </Button>
        </div>
      )}
    </main>
  );
}

function HistoryCard({ row }: { row: HistoryRow }) {
  // เจ้าของบิลไปหน้าเก็บเงิน คนจ่ายไปหน้าจ่าย
  const href = row.isCreator ? `/bills/${row.id}/manage` : `/bills/${row.id}/pay`;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-brand/40 hover:shadow-card"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{row.title}</p>
          {row.isCreator ? <Badge>ฉันสร้าง</Badge> : <Badge tone="brand">ถูกเรียกเก็บ</Badge>}
          {row.status === 'SETTLED' && <Badge tone="success">เสร็จสิ้น</Badge>}
          {row.status === 'CANCELLED' && <Badge tone="danger">ยกเลิก</Badge>}
        </div>
        <p className="mt-1 text-xs text-ink-faint">
          {formatDate(row.createdAt)} · {row.paidCount}/{row.participantCount} คนจ่ายแล้ว
        </p>
      </div>

      <div className="shrink-0 text-right">
        {row.myAmountSatang !== null && !row.isCreator ? (
          <>
            <p className="text-sm font-bold tabular-nums text-ink">
              {formatAmount(row.myAmountSatang)}
            </p>
            <p className="text-xs text-ink-faint">
              {row.myStatus === 'PAID' ? 'จ่ายแล้ว' : 'ยอดของฉัน'}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold tabular-nums text-ink">
              {formatAmount(row.totalSatang)}
            </p>
            <p className="text-xs text-ink-faint">ยอดรวม</p>
          </>
        )}
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'success' | 'warning' | 'brand';
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-bold tabular-nums',
          tone === 'success' && 'text-success-ink',
          tone === 'warning' && 'text-warning-ink',
          tone === 'brand' && 'text-brand',
          !tone && 'text-ink',
        )}
      >
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-ink-faint">{unit}</span>}
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
