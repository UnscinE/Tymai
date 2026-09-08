'use client';

import { Input } from '@/shared/components/ui/Input';
import { formatAmount, toBaht, toSatang } from '@/shared/lib/currency';
import type { BillCharges, SplitResult } from '../types';

const SERVICE_PRESETS = [0, 10];
const VAT_PRESETS = [0, 7];

export function ChargesPanel({
  charges,
  split,
  onChange,
}: {
  charges: BillCharges;
  split: SplitResult;
  onChange: (patch: Partial<BillCharges>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <PercentField
          label="ค่าบริการ"
          value={charges.servicePercent}
          presets={SERVICE_PRESETS}
          onChange={(servicePercent) => onChange({ servicePercent })}
        />
        <PercentField
          label="VAT"
          value={charges.vatPercent}
          presets={VAT_PRESETS}
          onChange={(vatPercent) => onChange({ vatPercent })}
        />
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-muted">ส่วนลดทั้งบิล (บาท)</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={charges.discount ? String(toBaht(charges.discount)) : ''}
          placeholder="0.00"
          onChange={(e) => onChange({ discount: toSatang(e.target.value) })}
        />
      </label>

      <dl className="space-y-1.5 rounded-xl bg-surface-alt p-3 text-sm">
        <Row label="ยอดอาหาร" value={formatAmount(split.subtotal)} />
        {split.serviceTotal > 0 && (
          <Row label={`ค่าบริการ ${charges.servicePercent}%`} value={formatAmount(split.serviceTotal)} />
        )}
        {split.vatTotal > 0 && (
          <Row label={`VAT ${charges.vatPercent}%`} value={formatAmount(split.vatTotal)} />
        )}
        {split.discountTotal > 0 && (
          <Row label="ส่วนลด" value={`-${formatAmount(split.discountTotal)}`} tone="success" />
        )}
        <div className="!mt-2 flex items-baseline justify-between border-t border-line pt-2">
          <dt className="text-sm font-semibold text-ink">ยอดรวมทั้งบิล</dt>
          <dd className="text-base font-bold tabular-nums text-brand">{formatAmount(split.grandTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={tone === 'success' ? 'tabular-nums text-success-ink' : 'tabular-nums text-ink'}>
        {value}
      </dd>
    </div>
  );
}

function PercentField({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: number;
  presets: number[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label} (%)</span>
      <Input
        type="number"
        min="0"
        max="100"
        step="0.5"
        value={value ? String(value) : ''}
        placeholder="0"
        onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
      />
      <div className="mt-1 flex gap-1">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-faint transition hover:bg-brand-soft hover:text-brand-dark"
          >
            {preset}%
          </button>
        ))}
      </div>
    </div>
  );
}
