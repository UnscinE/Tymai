import type { Metadata } from 'next';
import { requireUser } from '@/server/guards';
import { getUserPayee } from '@/server/services/payee-service';
import { BillBuilder } from './BillBuilder';

export const metadata: Metadata = { title: 'สร้างบิลใหม่ · tymai' };

export default async function NewBillPage() {
  const user = await requireUser();
  const payee = await getUserPayee(user.id);

  return (
    <BillBuilder
      accountName={payee?.accountName ?? ''}
      hasPayee={Boolean(payee)}
      currentUser={{ id: user.id, name: user.name ?? 'ฉัน' }}
    />
  );
}
