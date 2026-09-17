import type { AuditRow } from '@/server/services/admin-service';
import { Badge } from '@/shared/components/ui/Badge';

const ACTION_LABELS: Record<string, string> = {
  'bill.create': 'สร้างบิล',
  'payment.verify-slip': 'ยืนยันสลิป',
  'payment.mark-paid': 'ติ๊กว่าจ่ายแล้ว',
  'payment.mark-unpaid': 'ยกเลิกสถานะจ่าย',
  'user.suspended': 'ระงับบัญชี',
  'user.active': 'คืนสิทธิ์บัญชี',
  'user.deleted': 'ลบบัญชี',
  'user.set-role': 'เปลี่ยนสิทธิ์',
};

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-faint">ยังไม่มีกิจกรรม</p>;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-line bg-white p-3 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone={toneFor(row.action)}>{ACTION_LABELS[row.action] ?? row.action}</Badge>
                <p className="mt-2 text-sm text-ink-muted">{row.actorName ?? row.actorEmail ?? 'ระบบ'}</p>
              </div>
              <time className="shrink-0 text-xs text-ink-faint">{formatDateTime(row.createdAt)}</time>
            </div>
            <p className="mt-2 font-mono text-xs text-ink-faint">{row.entityType}/{row.entityId.slice(0, 8)}…</p>
            {row.metadata ? (
              <p className="mt-2 break-all border-t border-line pt-2 font-mono text-xs text-ink-faint">
                {JSON.stringify(row.metadata)}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              <th className="pb-2 font-medium">เวลา</th>
              <th className="pb-2 font-medium">การกระทำ</th>
              <th className="pb-2 font-medium">ผู้ทำ</th>
              <th className="pb-2 font-medium">เป้าหมาย</th>
              <th className="pb-2 font-medium">รายละเอียด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="py-2 pr-3 whitespace-nowrap text-xs text-ink-faint">
                  {formatDateTime(row.createdAt)}
                </td>
                <td className="py-2 pr-3">
                  <Badge tone={toneFor(row.action)}>{ACTION_LABELS[row.action] ?? row.action}</Badge>
                </td>
                <td className="max-w-48 truncate py-2 pr-3 text-ink-muted">
                  {row.actorName ?? row.actorEmail ?? 'ระบบ'}
                </td>
                <td className="py-2 pr-3 font-mono text-xs text-ink-faint">
                  {row.entityType}/{row.entityId.slice(0, 8)}…
                </td>
                <td className="py-2 font-mono text-xs break-all text-ink-faint">
                  {row.metadata ? JSON.stringify(row.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function toneFor(action: string) {
  if (action.startsWith('user.')) return 'warning' as const;
  if (action === 'payment.mark-unpaid') return 'danger' as const;
  if (action.startsWith('payment.')) return 'success' as const;
  return 'brand' as const;
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}
