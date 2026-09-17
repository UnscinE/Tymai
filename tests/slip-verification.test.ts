import { describe, expect, it, vi } from 'vitest';
import { fingerprintPayload, isPaymentQR, isSlipPayload } from '@/features/slip-verification/lib/slip-payload';
import { verifySlip } from '@/features/slip-verification/lib/verify-slip.server';

vi.mock('server-only', () => ({}));

const validSlipPayload = '00020101021212345678901234567890';

describe('slip-verification spec', () => {
    it('accepts a supported slip-shaped payload', () => {
        expect(isSlipPayload(validSlipPayload)).toBe(true);
        expect(verifySlip({ payload: validSlipPayload, expectedAmount: 12500 })).toMatchObject({ ok: true });
    });

    it('rejects short, malformed, and payment QR payloads', () => {
        expect(isSlipPayload('hello')).toBe(false);
        expect(isSlipPayload('00020101021253037645802TH')).toBe(false);
        expect(isPaymentQR('00020101021253037645802TH')).toBe(true);
        expect(verifySlip({ payload: 'hello', expectedAmount: 100 })).toMatchObject({
            ok: false,
            reason: 'not-a-slip',
        });
    });

    it('creates a deterministic SHA-256 fingerprint from normalized payload', async () => {
        const fingerprint = await fingerprintPayload('  payload  ');
        expect(fingerprint).toHaveLength(64);
        await expect(fingerprintPayload('payload')).resolves.toBe(fingerprint);
    });
});
