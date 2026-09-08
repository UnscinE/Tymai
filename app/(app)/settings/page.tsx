import type { Metadata } from 'next';
import { db } from '@/server/db';
import { requireUser } from '@/server/guards';
import { getUserPayeeMasked } from '@/server/services/payee-service';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = { title: 'ตั้งค่าบัญชี · tymai' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, payee] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, username: true, phone: true, email: true },
    }),
    getUserPayeeMasked(user.id),
  ]);

  return (
    <SettingsClient
      initialPayee={payee}
      initial={{
        name: profile.name ?? '',
        username: profile.username ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
      }}
    />
  );
}
