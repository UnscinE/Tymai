import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { formatAmount } from '@/shared/lib/currency';

export const metadata: Metadata = { title: 'หน้าหลัก · tymai' };

// Dashboard แสดงสถานะที่เปลี่ยนตลอด — ห้าม cache
export const dynamic = 'force-dynamic';

/**
 * Dashboard เดียว แต่แบ่งสองส่วนตาม "บทบาทต่อบิล" ไม่ใช่ตาม role ของผู้ใช้
 *   - บิลที่ฉันสร้าง  → Bill.creatorId = ฉัน       (มุมมอง Creator)
 *   - บิลที่ฉันต้องจ่าย → BillParticipant.userId = ฉัน (มุมมอง Payer)
 * คนเดียวกันเห็นได้ทั้งสองส่วนพร้อมกัน ไม่ต้องสลับบัญชี
 */
export default async function DashboardPage() {
  const user = await requireUser();

  const [createdBills, pendingParticipations] = await Promise.all([
    db.bill.findMany({
      where: { creatorId: user.id, status: { in: ['DRAFT', 'OPEN'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        totalSatang: true,
        createdAt: true,
        _count: { select: { participants: true } },
      },
    }),
    db.billParticipant.findMany({
      where: { userId: user.id, status: { in: ['UNPAID', 'PENDING_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amountDueSatang: true,
        status: true,
        bill: { select: { id: true, title: true, status: true } },
      },
    }),
  ]);

  const outstanding = pendingParticipations.reduce((sum, p) => sum + p.amountDueSatang, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            สวัสดี {user.name ?? 'ครับ'}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {pendingParticipations.length > 0
              ? `คุณมี ${pendingParticipations.length} บิลที่ต้องชำระ รวม ${formatAmount(outstanding)} บาท`
              : 'ไม่มีบิลค้างชำระ'}
          </p>
        </div>
        <Link href="/bills/new">
          <Button>+ สร้างบิลใหม่</Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="บิลที่ต้องชำระ"
            description="บิลที่เพื่อนเรียกเก็บจากคุณ"
            action={
              pendingParticipations.length > 0 ? (
                <Badge tone="warning">{pendingParticipations.length}</Badge>
              ) : undefined
            }
          />
          <CardBody>
            {pendingParticipations.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-faint">ยังไม่มีบิลที่ต้องจ่าย</p>
            ) : (
              <ul className="space-y-2">
                {pendingParticipations.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/bills/${p.bill.id}/pay`}
                      className="flex items-center justify-between rounded-xl border border-line bg-white p-3 transition hover:border-brand/40"
                    >
                      <span className="truncate text-sm font-medium text-ink">{p.bill.title}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-brand">
                        {formatAmount(p.amountDueSatang)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="บิลที่ฉันสร้าง" description="ที่ยังเก็บเงินไม่ครบ" />
          <CardBody>
            {createdBills.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-ink-faint">ยังไม่ได้สร้างบิลไหนเลย</p>
                <Link href="/bills/new" className="mt-2 inline-block">
                  <Button size="sm" variant="secondary">
                    สร้างบิลแรก
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {createdBills.map((bill) => (
                  <li key={bill.id}>
                    <Link
                      href={`/bills/${bill.id}/manage`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-3 transition hover:border-brand/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {bill.title}
                        </span>
                        <span className="text-xs text-ink-faint">
                          {bill._count.participants} คน
                        </span>
                      </span>
                      <Badge tone={bill.status === 'DRAFT' ? 'neutral' : 'brand'}>
                        {bill.status === 'DRAFT' ? 'ฉบับร่าง' : 'กำลังเก็บเงิน'}
                      </Badge>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                        {formatAmount(bill.totalSatang)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
