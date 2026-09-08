'use client';

import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { fadeUp } from '@/shared/components/motion/variants';
import { GoogleButton } from './GoogleButton';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // callbackUrl มาจาก middleware ตอนเตะผู้ใช้มาที่นี่ — พากลับไปหน้าที่ตั้งใจจะเข้า
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn('credentials', { email, password, redirect: false });

    if (res?.error) {
      // ไม่บอกว่า "ไม่พบอีเมลนี้" หรือ "รหัสผ่านผิด" แยกกัน
      // ไม่งั้นผู้โจมตีใช้หน้านี้ไล่เช็คว่าอีเมลไหนมีบัญชีในระบบได้
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <Card>
        <CardBody className="space-y-4 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">เข้าสู่ระบบ</h1>
            <p className="mt-0.5 text-sm text-ink-muted">ยินดีต้อนรับกลับมา</p>
          </div>

          <GoogleButton callbackUrl={callbackUrl} />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-faint">หรือ</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">อีเมล</span>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">รหัสผ่าน</span>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger-ink">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </Button>
          </form>

          <p className="text-center text-xs text-ink-muted">
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" className="font-medium text-brand hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </CardBody>
      </Card>
    </motion.div>
  );
}
