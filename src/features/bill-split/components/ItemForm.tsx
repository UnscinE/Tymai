'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

export function ItemForm({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (name: string, price: string) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const submit = () => {
    if (!name.trim() || !price) return;
    onAdd(name, price);
    setName('');
    setPrice('');
  };

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        placeholder="ชื่อเมนู เช่น ผัดกะเพรา"
        disabled={disabled}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Input
        value={price}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="ราคา"
        disabled={disabled}
        className="w-28"
        onChange={(e) => setPrice(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Button onClick={submit} disabled={disabled || !name.trim() || !price}>
        เพิ่ม
      </Button>
    </div>
  );
}
