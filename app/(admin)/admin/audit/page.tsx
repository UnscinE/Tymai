import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { listAuditActions, listAuditLog } from '@/server/services/admin-service';
import { AuditTable } from '@/features/admin';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { cn } from '@/shared/lib/cn';

export const metadata: Metadata = { title: 'Audit log · admin' };
export const dynamic = 'force-dynamic';

export default async function AdminAuditPage({ searchParams }: PageProps<'/admin/audit'>) {
  await requireAdmin();
  const sp = await searchParams;
  const action = typeof sp.action === 'string' ? sp.action : '';

  const [rows, actions] = await Promise.all([
    listAuditLog({ action: action || undefined, limit: 200 }),
    listAuditActions(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-ink">Audit log</h1>
      <p className="mb-6 text-sm text-ink-muted">
        บันทึกทุกการกระทำที่เปลี่ยนสถานะเงิน ใช้สืบตอนมีข้อพิพาท — เขียนอย่างเดียว แก้ไม่ได้
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip href="/admin/audit" label="ทั้งหมด" active={!action} />
        {actions.map((a) => (
          <FilterChip
            key={a}
            href={`/admin/audit?action=${encodeURIComponent(a)}`}
            label={a}
            active={action === a}
          />
        ))}
      </div>

      <Card>
        <CardHeader title={`${rows.length} รายการล่าสุด`} />
        <CardBody>
          <AuditTable rows={rows} />
        </CardBody>
      </Card>
    </main>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-white text-ink-muted hover:border-brand/40 hover:text-brand',
      )}
    >
      {label}
    </Link>
  );
}
