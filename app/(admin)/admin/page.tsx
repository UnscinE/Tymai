import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { getOverview, listAuditLog } from '@/server/services/admin-service';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { formatAmount } from '@/shared/lib/currency';
import { AuditTable } from '@/features/admin';

export const metadata: Metadata = { title: 'ภาพรวมระบบ · admin' };
export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [overview, recentAudit] = await Promise.all([getOverview(), listAuditLog({ limit: 15 })]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">ระบบจัดการ</p>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink md:text-3xl">ภาพรวมระบบ</h1>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="ผู้ใช้ทั้งหมด" value={overview.users.total} sub={`+${overview.users.newThisWeek} ใน 7 วัน`} />
        <Stat label="ถูกระงับ" value={overview.users.suspended} sub={`ใช้งานอยู่ ${overview.users.active}`} tone={overview.users.suspended > 0 ? 'danger' : undefined} />
        <Stat label="บิลทั้งหมด" value={overview.bills.total} sub={`+${overview.bills.newThisWeek} ใน 7 วัน`} />
        <Stat label="สลิปที่ยืนยันแล้ว" value={overview.slips.verified} sub={`+${overview.slips.last7Days} ใน 7 วัน`} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs text-ink-faint">ยอดที่เก็บได้แล้วทั้งระบบ</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-success-ink">
              {formatAmount(overview.money.collectedSatang)} บาท
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              บิลที่ปิดแล้ว {overview.bills.settled} ใบ
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-ink-faint">ยอดที่ยังค้างเก็บ</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-warning-ink">
              {formatAmount(overview.money.outstandingSatang)} บาท
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              จากบิลที่ยังเปิดอยู่ {overview.bills.open} ใบ
            </p>
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="กิจกรรมล่าสุด"
          description="ทุกการกระทำที่เปลี่ยนสถานะเงิน"
          action={
            <Link href="/admin/audit" className="text-xs text-brand hover:underline">
              ดูทั้งหมด
            </Link>
          }
        />
        <CardBody>
          <AuditTable rows={recentAudit} />
        </CardBody>
      </Card>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: 'danger';
}) {
  return (
    <div className="rounded-2xl border border-line/80 bg-surface p-4 shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md">
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={
          tone === 'danger'
            ? 'mt-0.5 text-2xl font-bold tabular-nums text-danger-ink'
            : 'mt-0.5 text-2xl font-bold tabular-nums text-ink'
        }
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}
