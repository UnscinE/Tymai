'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import type { QRLogo, QRLogoPreset } from '../types';

export function LogoPicker({
  logo,
  presets,
  error,
  onSelectPreset,
  onUpload,
  onClear,
}: {
  logo: QRLogo;
  presets: QRLogoPreset[];
  error: string | null;
  onSelectPreset: (id: string) => void;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-muted">โลโก้กลาง QR</p>
        {logo.kind !== 'none' && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-ink-faint underline-offset-2 hover:text-ink hover:underline"
          >
            เอาออก
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const active = logo.kind === 'preset' && logo.presetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={active}
              onClick={() => onSelectPreset(preset.id)}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-xl border bg-white transition',
                'hover:scale-105 active:scale-95',
                active ? 'border-brand ring-4 ring-brand/15' : 'border-line',
              )}
            >
              <Image src={preset.src} alt="" width={26} height={26} unoptimized />
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'h-10 rounded-xl border border-dashed px-3 text-xs font-medium transition',
            'hover:border-brand hover:text-brand active:scale-95',
            logo.kind === 'custom' ? 'border-brand text-brand' : 'border-line text-ink-muted',
          )}
        >
          {logo.kind === 'custom' ? 'เปลี่ยนรูป' : 'อัปโหลดเอง'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {logo.kind === 'custom' && (
        <p className="truncate text-xs text-ink-faint">ไฟล์: {logo.fileName}</p>
      )}
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
