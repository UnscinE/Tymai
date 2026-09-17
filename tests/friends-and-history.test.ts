import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/server/db', () => ({
    db: { friendship: { findMany } },
}));

const { filterLinkableUserIds } = await import('@/server/services/friend-service');

describe('friends-and-history spec', () => {
    beforeEach(() => findMany.mockClear());

    it('allows the creator and accepted friends only', async () => {
        findMany.mockResolvedValueOnce([
            { requesterId: 'owner', addresseeId: 'friend' },
        ]);

        await expect(
            filterLinkableUserIds('owner', ['owner', 'friend', 'stranger', 'friend']),
        ).resolves.toEqual(new Set(['owner', 'friend']));
    });

    it('does not link anyone when no candidates are provided', async () => {
        await expect(filterLinkableUserIds('owner', [])).resolves.toEqual(new Set());
        expect(findMany).not.toHaveBeenCalled();
    });
});
