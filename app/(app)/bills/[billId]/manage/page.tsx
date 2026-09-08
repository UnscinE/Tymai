import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/guards';
import { getBill } from '@/server/services/bill-service';
import { ManageBillClient } from './ManageBillClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/bills/[billId]/manage'>): Promise<Metadata> {
  const { billId } = await params;
  const user = await requireUser();
  const bill = await getBill(billId, user.id);
  return { title: bill ? `${bill.title} · เก็บเงิน` : 'ไม่พบบิลนี้' };
}

export default async function ManageBillPage({ params }: PageProps<'/bills/[billId]/manage'>) {
  const { billId } = await params;
  const user = await requireUser();

  const bill = await getBill(billId, user.id);
  // "ไม่เจอ" กับ "ไม่ใช่ของเรา" ต้องตอบเหมือนกัน ไม่งั้นคนนอกไล่เดา id ได้ว่าบิลไหนมีอยู่จริง
  if (!bill || (!bill.isCreator && user.role !== 'ADMIN')) notFound();

  return <ManageBillClient initialBill={bill} />;
}
