import type { Metadata } from 'next';
import { requireUser } from '@/server/guards';
import { listFriends, listPendingRequests } from '@/server/services/friend-service';
import { FriendsClient } from '@/features/friends';

export const metadata: Metadata = { title: 'เพื่อน · tymai' };
export const dynamic = 'force-dynamic';

export default async function FriendsPage() {
  const user = await requireUser();
  // โหลดฝั่ง server ครั้งแรก หน้าจะได้ไม่กระพริบตอนเปิด
  const [friends, requests] = await Promise.all([
    listFriends(user.id),
    listPendingRequests(user.id),
  ]);

  return <FriendsClient initialFriends={friends} initialRequests={requests} />;
}
