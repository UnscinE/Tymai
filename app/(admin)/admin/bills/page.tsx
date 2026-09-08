import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/server/guards';
import { listBills } from '@/server/services/admin-service';
import { AdminSearch } from '@/features/admin/components/AdminSearch';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { formatAmount } from '@/shared/lib/currency';

export const metadata: Metadata = { title: 'บิลทั้งหมด · admin' };
export const dynamic = 'force-dynamic';

export default async function AdminBillsPage({ searchParams }: PageProps<'/admin/bills'>) {
  await requireAdmin();
  const sp = await searchParams;
  const query = (typeof sp.q === 'string' ? sp.q : '').trim().slice(0, 80);

  const bills = await listBills({ query });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink">บิลทั้งระบบ</h1>

      <Card>
        <CardHeader
          title={`${bills.length} ใบ`}
          description="ค้นหาด้วยชื่อบิล หรืออีเมลของผู้สร้าง"
          action={<AdminSearch basePath="/admin/bills" initial={query} />}
        />
        <CardBody>
          {bills.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-faint">ไม่พบบิลที่ตรงกับคำค้น</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-faint">
                    <th className="pb-2 font-medium">บิล</th>
                    <th className="pb-2 font-medium">ผู้สร้าง</th>
                    <th className="pb-2 font-medium">สถานะ</th>
                    <th className="pb-2 font-medium">คนจ่าย</th>
                    <th className="pb-2 text-right font-medium">ยอดรวม</th>
                    <th className="pb-2 font-medium">สร้างเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="max-w-[14rem] py-2.5 pr-3">
                        <Link
                          href={`/bills/${bill.id}/manage`}
                          className="truncate font-medium text-ink hover:text-brand hover:underline"
                        >
                          {bill.title}
                        </Link>
                      </td>
                      <td className="max-w-[14rem] py-2.5 pr-3">
                        <p className="truncate text-ink-muted">{bill.creatorName ?? 'ไม่มีชื่อ'}</p>
                        <p className="truncate text-xs text-ink-faint">{bill.creatorEmail}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={bill.status === 'SETTLED' ? 'success' : 'brand'}>
                          {bill.status === 'SETTLED' ? 'ปิดแล้ว' : bill.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-xs whitespace-nowrap text-ink-muted">
                        {bill.paidCount}/{bill.participantCount}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-ink">
                        {formatAmount(bill.totalSatang)}
                      </td>
                      <td className="py-2.5 text-xs whitespace-nowrap text-ink-faint">
                        {formatDate(bill.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </main>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
