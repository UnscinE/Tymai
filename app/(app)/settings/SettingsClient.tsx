'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';

type Profile = { name: string; username: string; phone: string; email: string };
type Payee = { masked: string; accountName: string } | null;

export function SettingsClient({ initial, initialPayee }: { initial: Profile; initialPayee: Payee }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Profile) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setError(null);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, username: form.username, phone: form.phone }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'บันทึกไม่สำเร็จ');
      setStatus('idle');
      return;
    }
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">ตั้งค่าบัญชี</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ตั้ง username หรือเบอร์โทรไว้ เพื่อนจะได้ค้นหาคุณเจอโดยไม่ต้องบอกอีเมล
        </p>
      </header>

      <Card>
        <CardHeader title="โปรไฟล์" description="ข้อมูลที่เพื่อนใช้ค้นหาคุณ" />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">ชื่อที่ให้เพื่อนเห็น</span>
              <Input value={form.name} maxLength={60} required onChange={set('name')} />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                username (ไม่บังคับ)
              </span>
              <Input
                value={form.username}
                placeholder="เช่น khaotang"
                autoComplete="off"
                onChange={set('username')}
              />
              <span className="mt-1 block text-xs text-ink-faint">
                a-z 0-9 _ . ยาว 3-20 ตัว · เว้นว่างไว้ได้ถ้าไม่อยากตั้ง
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                เบอร์โทร (ไม่บังคับ)
              </span>
              <Input
                value={form.phone}
                placeholder="0812345678"
                inputMode="tel"
                autoComplete="tel"
                onChange={set('phone')}
              />
              <span className="mt-1 block text-xs text-ink-faint">
                ใช้สำหรับให้เพื่อนค้นหาเท่านั้น ระบบไม่แสดงเบอร์นี้ให้ใครเห็นในผลการค้นหา
              </span>
            </label>

            <div className="rounded-xl bg-surface-alt px-3 py-2">
              <span className="text-xs text-ink-faint">อีเมล (เปลี่ยนไม่ได้)</span>
              <p className="text-sm text-ink-muted">{form.email}</p>
            </div>

            {error && (
              <p className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger-ink">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={status === 'saving'}>
                {status === 'saving' ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              {status === 'saved' && <span className="text-xs text-success-ink">บันทึกแล้ว</span>}
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mt-5">
        <PayeeCard initial={initialPayee} />
      </div>
    </main>
  );
}

/**
 * บัญชีรับเงิน — เลข PromptPay ถูกเข้ารหัสก่อนเก็บลงฐานข้อมูล
 * และไม่เคยถูกส่งกลับมาให้ client แบบเต็มอีกเลย (แสดงเฉพาะ 4 หลักท้าย)
 */
function PayeeCard({ initial }: { initial: Payee }) {
  const [payee, setPayee] = useState<Payee>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [promptPayId, setPromptPayId] = useState('');
  const [accountName, setAccountName] = useState(initial?.accountName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/payee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptPayId, accountName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'บันทึกไม่สำเร็จ');
        return;
      }
      setPayee(json.payee as Payee);
      setPromptPayId('');
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="บัญชีรับเงิน"
        description="เลข PromptPay ที่จะใช้สร้าง QR ในบิลที่คุณสร้าง"
      />
      <CardBody className="space-y-4">
        {payee && !editing ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success-soft p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{payee.accountName}</p>
              <p className="font-mono text-sm tracking-wider text-ink-muted">{payee.masked}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              เปลี่ยน
            </Button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">เลข PromptPay</span>
              <Input
                value={promptPayId}
                onChange={(e) => setPromptPayId(e.target.value)}
                placeholder="เบอร์โทร 10 หลัก / เลขบัตร 13 หลัก"
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                ชื่อบัญชีที่จะแสดงบน QR
              </span>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                maxLength={60}
                required
              />
            </label>

            {error && (
              <p className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger-ink">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'กำลังบันทึก...' : 'บันทึกบัญชีรับเงิน'}
              </Button>
              {payee && (
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  ยกเลิก
                </Button>
              )}
            </div>
          </form>
        )}

        <p className="text-xs text-ink-faint">
          ระบบเก็บเลขนี้แบบเข้ารหัส (AES-256-GCM) และแสดงให้เห็นแค่ 4 หลักท้าย
          บิลที่สร้างไปแล้วจะยังใช้เลขเดิมที่บันทึกไว้ตอนสร้าง แม้คุณจะเปลี่ยนเลขที่นี่
        </p>
      </CardBody>
    </Card>
  );
}
