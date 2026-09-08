'use client';

import { useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';

export function SlipDropzone({
  disabled,
  label = 'อัปโหลดสลิป',
  onFile,
}: {
  disabled?: boolean;
  label?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className="w-full"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'w-full rounded-xl border border-dashed px-3 py-2.5 text-sm font-medium transition',
          'active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45',
          dragging
            ? 'border-brand bg-brand-soft text-brand-dark'
            : 'border-line bg-white text-ink-muted hover:border-brand/50 hover:text-brand',
        )}
      >
        {dragging ? 'วางไฟล์ตรงนี้ได้เลย' : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
