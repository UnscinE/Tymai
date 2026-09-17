'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { staggerList } from '@/shared/components/motion/variants';
import type { Person } from '../types';

export function PeopleManager({
  people,
  onAdd,
  onRemove,
}: {
  people: Person[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState('');

  const submit = () => {
    onAdd(name);
    setName('');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={name}
          placeholder="ชื่อเพื่อน เช่น ข้าวตัง"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={60}
        />
        <Button onClick={submit} disabled={!name.trim()}>
          เพิ่มคน
        </Button>
      </div>

      <motion.ul variants={staggerList} initial="hidden" animate="show" className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {people.map((person) => (
            <motion.li
              key={person.id}
              layout
              initial={{ opacity: 0, scale: 0.9, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.9, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="overflow-hidden"
            >
              <div className={
                person.userId
                  ? 'group flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft py-1 pr-1 pl-3'
                  : 'group flex items-center gap-1.5 rounded-full border border-line bg-surface-alt py-1 pr-1 pl-3'
              }>
                <span className="text-sm font-medium text-ink">{person.name}</span>
                {/* มีบัญชีในระบบ = บิลจะไปโผล่ในหน้าของเขาเอง ไม่ต้องรอลิงก์ */}
                {person.userId && (
                  <span title="ผูกกับบัญชีผู้ใช้แล้ว" aria-label="ผูกกับบัญชีผู้ใช้แล้ว" className="text-xs text-brand">
                    ●
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`ลบ ${person.name}`}
                  onClick={() => onRemove(person.id)}
                  className="grid h-5 w-5 place-items-center rounded-full text-ink-faint transition hover:bg-danger/10 hover:text-danger-ink"
                >
                  ×
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {
        people.length === 0 && (
          <p className="text-sm text-ink-faint">ยังไม่มีสมาชิก — เพิ่มชื่อเพื่อนที่ร่วมโต๊ะก่อน</p>
        )
      }
    </div >
  );
}
