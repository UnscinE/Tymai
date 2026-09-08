'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PendingRequests, PublicUser, SearchResult } from '@/server/services/friend-service';

type State = {
  friends: PublicUser[];
  requests: PendingRequests;
  loading: boolean;
};

const EMPTY_REQUESTS: PendingRequests = { incoming: [], outgoing: [] };

export function useFriends(initial?: { friends: PublicUser[]; requests: PendingRequests }) {
  const [state, setState] = useState<State>({
    friends: initial?.friends ?? [],
    requests: initial?.requests ?? EMPTY_REQUESTS,
    loading: !initial,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [friendsRes, requestsRes] = await Promise.all([
      fetch('/api/friends', { cache: 'no-store' }),
      fetch('/api/friends/requests', { cache: 'no-store' }),
    ]);
    if (!friendsRes.ok || !requestsRes.ok) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const friends = (await friendsRes.json()).friends as PublicUser[];
    const requests = (await requestsRes.json()) as PendingRequests;
    setState({ friends, requests, loading: false });
  }, []);

  useEffect(() => {
    // refresh() setState หลัง await เท่านั้น ไม่ใช่ synchronous cascade ที่กฎนี้ตั้งใจกัน
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!initial) void refresh();
  }, [initial, refresh]);

  const addFriend = useCallback(
    async (userId: string) => {
      setBusyId(userId);
      try {
        const res = await fetch('/api/friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (res.ok) await refresh();
        return res.ok;
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const respond = useCallback(
    async (requestId: string, accept: boolean) => {
      setBusyId(requestId);
      try {
        const res = await fetch('/api/friends/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, accept }),
        });
        if (res.ok) await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const removeFriend = useCallback(
    async (userId: string) => {
      setBusyId(userId);
      try {
        const res = await fetch(`/api/friends?userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });
        if (res.ok) await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  return { ...state, busyId, refresh, addFriend, respond, removeFriend } as const;
}

/** ค้นหาผู้ใช้แบบตรงเป๊ะ — ยิงเมื่อผู้ใช้กดค้นหาเท่านั้น ไม่ยิงทุกตัวอักษร */
export function useUserSearch() {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 3) return;
    setSearching(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const json = await res.json();
      const found = (json.results ?? []) as SearchResult[];
      setResults(found);
      setNotFound(found.length === 0);
    } finally {
      setSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults(null);
    setNotFound(false);
  }, []);

  return { results, searching, notFound, search, clear } as const;
}
