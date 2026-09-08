'use client';

import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { fadeUp } from '@/shared/components/motion/variants';
import { GoogleButton } from './GoogleButton';

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'สมัครสมาชิกไม่สำเร็จ');
      setLoading(false);
      return;
    }

    // สมัครเสร็จ login ให้เลย ผู้ใช้จะได้ไม่ต้องกรอกรหัสซ้ำ
    await signIn('credentials', { email: form.email, password: form.password, redirect: false });
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <Card>
        <CardBody className="space-y-4 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">สมัครสมาชิก</h1>
            <p className="mt-0.5 text-sm text-ink-muted">ใช้ฟรี ไม่มีค่าใช้จ่าย</p>
          </div>

          <GoogleButton />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-faint">หรือ</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">ชื่อที่ให้เพื่อนเห็น</span>
              <Input
                required
                maxLength={60}
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                placeholder="เช่น ข้าวตัง"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">อีเมล</span>
              <Input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">รหัสผ่าน</span>
              <Input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger-ink">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'กำลังสร้างบัญชี…' : 'สมัครสมาชิก'}
            </Button>
          </form>

          <p className="text-center text-xs text-ink-muted">
            มีบัญชีแล้ว?{' '}
            <Link href="/login" className="font-medium text-brand hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </CardBody>
      </Card>
    </motion.div>
  );
}
