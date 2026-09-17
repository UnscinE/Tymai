import { describe, expect, it } from 'vitest';
import { calculateSplit } from '@/features/bill-split/lib/calculate-split';
import { splitEvenly, toSatang } from '@/shared/lib/currency';

const people = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
];

describe('bill-splitting spec', () => {
    it('splits uneven satang without losing money', () => {
        expect(splitEvenly(100, 3)).toEqual([34, 33, 33]);
    });

    it('calculates item shares, charges, and exact grand total', () => {
        const split = calculateSplit({
            people,
            items: [
                { id: 'meal', name: 'Meal', price: 1000, sharedBy: ['a', 'b'] },
                { id: 'solo', name: 'Solo', price: 500, sharedBy: ['a'] },
            ],
            charges: { servicePercent: 10, vatPercent: 7, discount: 50 },
        });

        expect(split.unassignedItems).toHaveLength(0);
        expect(split.grandTotal).toBe(1716);
        expect(split.shares.reduce((sum, share) => sum + share.total, 0)).toBe(split.grandTotal);
        expect(split.byPersonId.a.subtotal).toBe(1000);
        expect(split.byPersonId.b.subtotal).toBe(500);
    });

    it('keeps unassigned items visible and outside participant shares', () => {
        const split = calculateSplit({
            people,
            items: [{ id: 'unassigned', name: 'Unassigned', price: 250, sharedBy: [] }],
            charges: { servicePercent: 0, vatPercent: 0, discount: 0 },
        });

        expect(split.unassignedItems.map((item) => item.id)).toEqual(['unassigned']);
        expect(split.unassignedAmount).toBe(250);
        expect(split.shares.every((share) => share.total === 0)).toBe(true);
    });

    it('converts decimal baht to integer satang', () => {
        expect(toSatang('1,250.50')).toBe(125050);
    });
});
