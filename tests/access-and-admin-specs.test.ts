import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readSpec(name: string) {
    return fs.readFileSync(path.join(root, 'openspec', 'specs', name, 'spec.md'), 'utf8');
}

describe('authentication-and-access spec', () => {
    it('documents authentication, account enforcement, authorization, and public access', () => {
        const spec = readSpec('authentication-and-access');
        expect(spec).toContain('User authentication');
        expect(spec).toContain('Account status enforcement');
        expect(spec).toContain('Role and resource authorization');
        expect(spec).toContain('Public bill access');
    });
});

describe('public-payment spec', () => {
    it('documents participant selection, QR generation, feedback, and privacy', () => {
        const spec = readSpec('public-payment');
        expect(spec).toContain('Participant selection');
        expect(spec).toContain('Server-derived payment QR');
        expect(spec).toContain('Payment progress feedback');
        expect(spec).toContain('Guest privacy');
    });
});

describe('administration-and-audit spec', () => {
    it('documents admin access, oversight, and immutable audit behavior', () => {
        const spec = readSpec('administration-and-audit');
        expect(spec).toContain('Administrator access');
        expect(spec).toContain('Bill and payment oversight');
        expect(spec).toContain('Immutable audit trail');
    });
});
