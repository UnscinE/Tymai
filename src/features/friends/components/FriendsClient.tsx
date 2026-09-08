'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { PendingRequests, PublicUser } from '@/server/services/friend-service';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { fadeUp, staggerList } from '@/shared/components/motion/variants';
import { useFriends, useUserSearch } from '../hooks/use-friends';

export function FriendsClient({
  initialFriends,
  initialRequests,
}: {
  initialFriends: PublicUser[];
  initialRequests: PendingRequests;
}) {
  const friends = useFriends({ friends: initialFriends, requests: initialRequests });
  const search = useUserSearch();
  const [query, setQuery] = useState('');

  const incoming = friends.requests.incoming;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">เพื่อน</h1>
        <p className="mt-1 text-sm text-ink-muted">
          เพิ่มเพื่อนไว้ล่วงหน้า เวลาสร้างบิลจะกดเลือกได้ทันที ไม่ต้องพิมพ์ชื่อใหม่ทุกครั้ง
        </p>
      </header>

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="เพิ่มเพื่อน"
            description="ค้นหาด้วยอีเมล username หรือเบอร์โทร (ต้องพิมพ์ให้ตรงทั้งหมด)"
          />
          <CardBody className="space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void search.search(query);
              }}
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="เช่น friend@example.com"
                autoComplete="off"
              />
              <Button type="submit" disabled={search.searching || query.trim().length < 3}>
                {search.searching ? 'กำลังค้นหา...' : 'ค้นหา'}
              </Button>
            </form>

            <p className="text-xs text-ink-faint">
              ระบบค้นแบบตรงเป๊ะเท่านั้น เพื่อไม่ให้ใครไล่เก็บอีเมลหรือเบอร์โทรของผู้ใช้คนอื่นได้
            </p>

            <AnimatePresence>
              {search.notFound && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden text-xs text-ink-muted"
                >
                  ไม่พบผู้ใช้ที่ตรงกับ &ldquo;{query}&rdquo; — ลองถามเพื่อนว่าสมัครด้วยอีเมลไหน
                  หรือให้เขาตั้ง username ที่หน้าตั้งค่า
                </motion.p>
              )}
            </AnimatePresence>

            {search.results && search.results.length > 0 && (
              <ul className="space-y-2">
                {search.results.map((result) => (
                  <li
                    key={result.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-white p-3"
                  >
                    <Avatar user={result} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{result.name ?? 'ผู้ใช้'}</p>
                      {result.username && (
                        <p className="truncate text-xs text-ink-faint">@{result.username}</p>
                      )}
                    </div>
                    <RelationAction
                      relation={result.relation}
                      busy={friends.busyId === result.id}
                      onAdd={() => void friends.addFriend(result.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {incoming.length > 0 && (
          <Card>
            <CardHeader
              title="คำขอเป็นเพื่อน"
              action={<Badge tone="warning">{incoming.length}</Badge>}
            />
            <CardBody>
              <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {incoming.map((req) => (
                    <motion.li
                      key={req.id}
                      layout
                      variants={fadeUp}
                      exit="exit"
                      className="flex items-center gap-3 rounded-xl border border-line bg-white p-3"
                    >
                      <Avatar user={req.user} />
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {req.user.name ?? 'ผู้ใช้'}
                      </p>
                      <Button
                        size="sm"
                        disabled={friends.busyId === req.id}
                        onClick={() => void friends.respond(req.id, true)}
                      >
                        ตอบรับ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={friends.busyId === req.id}
                        onClick={() => void friends.respond(req.id, false)}
                      >
                        ปฏิเสธ
                      </Button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader
            title="รายชื่อเพื่อน"
            description={`${friends.friends.length} คน`}
            action={
              friends.requests.outgoing.length > 0 ? (
                <Badge>ส่งคำขอไปแล้ว {friends.requests.outgoing.length}</Badge>
              ) : undefined
            }
          />
          <CardBody>
            {friends.friends.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-faint">
                ยังไม่มีเพื่อน — ค้นหาด้วยอีเมลของเพื่อนด้านบนได้เลย
              </p>
            ) : (
              <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {friends.friends.map((friend) => (
                    <motion.li
                      key={friend.id}
                      layout
                      variants={fadeUp}
                      exit="exit"
                      className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3"
                    >
                      <Avatar user={friend} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {friend.name ?? 'ผู้ใช้'}
                        </p>
                        {friend.username && (
                          <p className="truncate text-xs text-ink-faint">@{friend.username}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={friends.busyId === friend.id}
                        onClick={() => void friends.removeFriend(friend.id)}
                      >
                        ลบ
                      </Button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </CardBody>
        </Card>

        {friends.requests.outgoing.length > 0 && (
          <Card>
            <CardHeader title="คำขอที่ส่งไป" description="รอให้อีกฝ่ายตอบรับ" />
            <CardBody>
              <ul className="space-y-2">
                {friends.requests.outgoing.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt p-3"
                  >
                    <Avatar user={req.user} />
                    <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                      {req.user.name ?? 'ผู้ใช้'}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={friends.busyId === req.user.id}
                      onClick={() => void friends.removeFriend(req.user.id)}
                    >
                      ยกเลิก
                    </Button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

function RelationAction({
  relation,
  busy,
  onAdd,
}: {
  relation: string;
  busy: boolean;
  onAdd: () => void;
}) {
  if (relation === 'self') return <Badge>คุณเอง</Badge>;
  if (relation === 'friends') return <Badge tone="success">เป็นเพื่อนแล้ว</Badge>;
  if (relation === 'request-sent') return <Badge>รอตอบรับ</Badge>;
  return (
    <Button size="sm" disabled={busy} onClick={onAdd}>
      {relation === 'request-received' ? 'ตอบรับ' : 'เพิ่มเพื่อน'}
    </Button>
  );
}

export function Avatar({ user }: { user: PublicUser }) {
  const initial = (user.name ?? user.username ?? '?').trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark"
    >
      {initial}
    </span>
  );
}
