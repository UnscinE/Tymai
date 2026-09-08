'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { fadeUp } from '@/shared/components/motion/variants';

export function ShareLinkPanel({ publicToken }: { publicToken: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/b/${publicToken}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-2">
      <p className="text-xs text-ink-muted">
        ส่งลิงก์นี้ให้เพื่อนในกลุ่ม เขาจะเห็น QR ของตัวเองและอัปโหลดสลิปได้เองโดยไม่ต้องสมัครสมาชิก
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 w-full min-w-0 rounded-xl border border-line bg-surface-alt px-3 text-xs text-ink-muted"
        />
        <Button onClick={copy} className="shrink-0" variant={copied ? 'success' : 'primary'}>
          {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
        </Button>
      </div>
      <p className="text-xs text-ink-faint">
        ใครมีลิงก์นี้ก็เปิดดูบิลได้ ส่งเฉพาะในกลุ่มที่ร่วมโต๊ะเท่านั้น
      </p>
    </motion.div>
  );
}
