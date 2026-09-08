'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';

export function GoogleButton({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="secondary"
      className="w-full"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signIn('google', { callbackUrl });
      }}
    >
      <GoogleMark />
      {loading ? 'กำลังพาไป Google…' : 'ดำเนินการต่อด้วย Google'}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.3z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z"
      />
      <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.8l7.3-5.7z" />
      <path
        fill="#EA4335"
        d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.2 12.4-9.2z"
      />
    </svg>
  );
}
