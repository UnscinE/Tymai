import type { Metadata } from 'next';
import { requireAdmin } from '@/server/guards';
import { listUsers } from '@/server/services/admin-service';
import { UserTable } from '@/features/admin';
import { AdminSearch } from '@/features/admin/components/AdminSearch';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';

export const metadata: Metadata = { title: 'จัดการผู้ใช้ · admin' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }: PageProps<'/admin/users'>) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const query = (typeof sp.q === 'string' ? sp.q : '').trim().slice(0, 80);

  const users = await listUsers({ query });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink">จัดการผู้ใช้</h1>

      <Card>
        <CardHeader
          title={`ผู้ใช้ ${users.length} คน`}
          description="ค้นหาด้วยชื่อ อีเมล หรือ username"
          action={<AdminSearch basePath="/admin/users" initial={query} />}
        />
        <CardBody>
          <UserTable rows={users} currentUserId={admin.id} />
        </CardBody>
      </Card>
    </main>
  );
}
