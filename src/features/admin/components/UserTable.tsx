'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminUserRow } from '@/server/services/admin-service';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';

export function UserTable({ rows, currentUserId }: { rows: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (userId: string, patch: { status?: string; role?: string }) => {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...patch }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'ทำรายการไม่สำเร็จ');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-faint">ไม่พบผู้ใช้ที่ตรงกับคำค้น</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger-ink">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              <th className="pb-2 font-medium">ผู้ใช้</th>
              <th className="pb-2 font-medium">สิทธิ์</th>
              <th className="pb-2 font-medium">สถานะ</th>
              <th className="pb-2 font-medium">บิล</th>
              <th className="pb-2 font-medium">PromptPay</th>
              <th className="pb-2 font-medium">สมัครเมื่อ</th>
              <th className="pb-2 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const isSelf = row.id === currentUserId;
              const busy = busyId === row.id;
              return (
                <tr key={row.id}>
                  <td className="max-w-[16rem] py-2.5 pr-3">
                    <p className="truncate font-medium text-ink">{row.name ?? 'ไม่มีชื่อ'}</p>
                    <p className="truncate text-xs text-ink-faint">{row.email}</p>
                  </td>
                  <td className="py-2.5 pr-3">
                    {row.role === 'ADMIN' ? <Badge tone="brand">ADMIN</Badge> : <Badge>USER</Badge>}
                  </td>
                  <td className="py-2.5 pr-3">
                    {row.status === 'ACTIVE' ? (
                      <Badge tone="success">ใช้งานอยู่</Badge>
                    ) : (
                      <Badge tone="danger">{row.status === 'SUSPENDED' ? 'ถูกระงับ' : 'ถูกลบ'}</Badge>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs whitespace-nowrap text-ink-muted">
                    สร้าง {row.billsCreated} · ร่วม {row.billsJoined}
                  </td>
                  <td className="py-2.5 pr-3 text-xs">
                    {row.hasPayee ? (
                      <span className="text-success-ink">ตั้งแล้ว</span>
                    ) : (
                      <span className="text-ink-faint">ยังไม่ตั้ง</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs whitespace-nowrap text-ink-faint">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="py-2.5">
                    {isSelf ? (
                      <span className="text-xs text-ink-faint">บัญชีคุณเอง</span>
                    ) : (
                      <div className="flex gap-1.5">
                        {row.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => void act(row.id, { status: 'SUSPENDED' })}
                          >
                            ระงับ
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void act(row.id, { status: 'ACTIVE' })}
                          >
                            คืนสิทธิ์
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void act(row.id, { role: row.role === 'ADMIN' ? 'USER' : 'ADMIN' })
                          }
                        >
                          {row.role === 'ADMIN' ? 'ถอดแอดมิน' : 'ตั้งแอดมิน'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
