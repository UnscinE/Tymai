'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicUser } from '@/server/services/friend-service';
import { cn } from '@/shared/lib/cn';
import { Avatar } from './FriendsClient';

/**
 * เลือกเพื่อนจากรายชื่อมาใส่บิล
 *
 * คนที่ถูกเลือกจากที่นี่จะมี userId ติดไปด้วย ทำให้บิลไปโผล่ในหน้า
 * "บิลที่ต้องชำระ" ของเขาเอง แทนที่จะต้องรอเจ้าของบิลส่งลิงก์ให้
 * (ฝั่ง server จะตรวจซ้ำอีกชั้นว่าเป็นเพื่อนกันจริง — ห้ามเชื่อ userId จาก client)
 */
export function FriendPicker({
  selectedUserIds,
  onPick,
  currentUser,
}: {
  selectedUserIds: string[];
  onPick: (user: { id: string; name: string }) => void;
  currentUser: { id: string; name: string };
}) {
  const [friends, setFriends] = useState<PublicUser[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/friends', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { friends: [] }))
      .then((json) => {
        if (!cancelled) setFriends(json.friends as PublicUser[]);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (friends === null) {
    return <div className="h-10 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const selected = new Set(selectedUserIds);
  const meSelected = selected.has(currentUser.id);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <PickChip
          label={`${currentUser.name} (ฉัน)`}
          selected={meSelected}
          onClick={() => onPick(currentUser)}
        />

        <AnimatePresence initial={false}>
          {friends.map((friend) => (
            <motion.div key={friend.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PickChip
                label={friend.name ?? friend.username ?? 'เพื่อน'}
                selected={selected.has(friend.id)}
                withAvatar={friend}
                onClick={() => onPick({ id: friend.id, name: friend.name ?? 'เพื่อน' })}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {friends.length === 0 && (
        <p className="text-xs text-ink-faint">
          ยังไม่มีเพื่อนในรายชื่อ —{' '}
          <Link href="/friends" className="text-brand hover:underline">
            เพิ่มเพื่อนก่อน
          </Link>{' '}
          แล้วเขาจะเห็นบิลนี้ในหน้าของตัวเองเลย
        </p>
      )}
    </div>
  );
}

function PickChip({
  label,
  selected,
  withAvatar,
  onClick,
}: {
  label: string;
  selected: boolean;
  withAvatar?: PublicUser;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={selected}
      aria-pressed={selected}
      className={cn(
        'flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm font-medium transition',
        'active:scale-95 disabled:cursor-default disabled:active:scale-100',
        selected
          ? 'border-success/30 bg-success-soft text-success-ink'
          : 'border-line bg-white text-ink-muted hover:border-brand/40 hover:text-brand',
      )}
    >
      {withAvatar ? (
        <Avatar user={withAvatar} />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
          ฉ
        </span>
      )}
      <span className="max-w-[10rem] truncate">{label}</span>
      {selected && <span aria-hidden="true">✓</span>}
    </button>
  );
}
