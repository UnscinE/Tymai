'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
  const [quantity, setQuantity] = useState('1');

  const submit = () => {
    if (!name.trim() || !price) return;
    
    const qty = parseInt(quantity, 10) || 1;
    const unitPrice = parseFloat(price);
    const totalPrice = (unitPrice * qty).toFixed(2);
    
    const finalName = qty > 1 ? `${name.trim()} (x${qty})` : name.trim();
    
    onAdd(finalName, totalPrice);
    
    setName('');
    setPrice('');
    setQuantity('1');
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={name}
        placeholder="ชื่อเมนู เช่น ผัดกะเพรา"
        disabled={disabled}
        maxLength={80}
        className="flex-1"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="flex gap-2">
        <Input
          value={price}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="ราคา"
          disabled={disabled}
          className="w-24 tabular-nums"
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Input
          value={quantity}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          placeholder="Qty"
          disabled={disabled}
          className="w-16 tabular-nums"
          onChange={(e) => setQuantity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button 
          onClick={submit} 
          disabled={disabled || !name.trim() || !price}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-1 h-4 w-4" /> เพิ่ม
        </Button>
      </div>
    </div>
  );
}
