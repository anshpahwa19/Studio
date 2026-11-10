'use client';
import { useEffect, useState } from 'react';

type T = { id: number; text: string; kind: 'ok' | 'error' };
let push: (t: Omit<T, 'id'>) => void = () => {};

export const toast = {
  ok: (text: string) => push({ text, kind: 'ok' }),
  error: (text: string) => push({ text, kind: 'error' }),
};

export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s, { ...t, id }]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.kind === 'error' ? 6000 : 3000);
    };
  }, []);
  return (
    <div className="no-print fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`max-w-sm rounded-lg px-4 py-2.5 text-[13.5px] shadow-lg ${t.kind === 'ok' ? 'bg-ink text-white' : 'bg-red-700 text-white'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
