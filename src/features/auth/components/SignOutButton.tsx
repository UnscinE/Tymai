'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/shared/components/ui/Button';

export function SignOutButton() {
  return (
    <Button size="sm" variant="ghost" onClick={() => void signOut({ callbackUrl: '/' })}>
      ออกจากระบบ
    </Button>
  );
}
