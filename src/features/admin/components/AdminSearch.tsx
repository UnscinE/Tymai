'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

export function AdminSearch({ basePath, initial }: { basePath: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath);
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ค้นหา"
        className="w-44"
      />
      <Button type="submit" variant="secondary">
        ค้นหา
      </Button>
    </form>
  );
}
