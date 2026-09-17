import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specs = [
    'authentication-and-access',
    'bill-splitting',
    'public-payment',
    'slip-verification',
    'friends-and-history',
    'administration-and-audit',
];

describe('OpenSpec coverage', () => {
    for (const specName of specs) {
        it(`${specName} contains requirements with scenarios`, () => {
            const file = path.join(root, 'openspec', 'specs', specName, 'spec.md');
            const content = fs.readFileSync(file, 'utf8');
            const requirementCount = (content.match(/^### Requirement:/gm) ?? []).length;
            const scenarioCount = (content.match(/^#### Scenario:/gm) ?? []).length;

            expect(requirementCount, `${specName} requirements`).toBeGreaterThan(0);
            expect(scenarioCount, `${specName} scenarios`).toBeGreaterThanOrEqual(requirementCount);
        });
    }
});
