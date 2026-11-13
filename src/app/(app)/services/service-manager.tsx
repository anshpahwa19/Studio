'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Input, Select, Textarea } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/client/use-action';
import { fmtDuration, money0 } from '@/lib/format';
import { addCategory, archiveService, restoreService, saveService, type ServiceInput } from './api';

type Service = { id: string; name: string; description: string | null; categoryId: string; price: number; duration: number; active: boolean };
type Category = { id: string; name: string; services: Service[] };

export function ServiceManager({ categories, editable }: { categories: Category[]; editable: boolean }) {
  const [editing, setEditing] = useState<ServiceInput | null>(null);
  const [archiving, setArchiving] = useState<Service | null>(null);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { run, pending } = useAction();

  const archivedCount = categories.reduce((a, c) => a + c.services.filter((s) => !s.active).length, 0);
  const shown = categories
    .filter((c) => filter === 'all' || c.id === filter)
    .map((c) => ({ ...c, services: c.services.filter((s) => (showArchived || s.active) && s.name.toLowerCase().includes(q.toLowerCase())) }))
    .filter((c) => c.services.length || (!q && filter !== 'all'));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input id="svc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services" className="max-w-xs" aria-label="Search services" />
        <Select id="svc-cat" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-[220px]" aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink-soft">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-violet-600" />
          Show archived{archivedCount > 0 && ` (${archivedCount})`}
        </label>
        {editable && (
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={() => setNewCat('')}>Add category</Button>
            <Button onClick={() => setEditing({ name: '', categoryId: filter !== 'all' ? filter : categories[0]?.id ?? '', price: '' as unknown as number, duration: 30 })}>
              <Plus size={16} />New service
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {shown.length === 0 && <Card><Empty title="No services match" /></Card>}
        {shown.map((c) => (
          <Card key={c.id} title={c.name} pad={false} actions={<span className="text-[12.5px] text-ink-mute">{c.services.filter((s) => s.active).length} services</span>}>
            {c.services.length === 0 ? <Empty title="No services in this category yet" /> : (
              <ul className="divide-y divide-line">
                {c.services.map((s) => (
                  <li key={s.id} className={`flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 ${s.active ? '' : 'bg-stone-50'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-medium">{s.name}{!s.active && <Badge>Archived</Badge>}</div>
                      {s.description && <div className="text-[12.5px] text-ink-mute">{s.description}</div>}
                    </div>
                    <div className="tabular w-16 text-ink-soft">{fmtDuration(s.duration)}</div>
                    <div className="tabular w-20 text-right font-medium">{money0(s.price)}</div>
                    {editable && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ ...s })}>Edit</Button>
                        {s.active
                          ? <Button size="sm" variant="ghost" onClick={() => setArchiving(s)}>Archive</Button>
                          : <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => restoreService(s.id), 'Service restored')}>Unarchive</Button>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit service' : 'New service'}>
        {editing && (
          <form
            className="grid grid-cols-2 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if ((await run(() => saveService(editing), 'Service saved')) !== false) setEditing(null);
            }}
          >
            <Field label="Service name" className="col-span-2"><Input id="s-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
            <Field label="Category" className="col-span-2">
              <Select id="s-cat" value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Price before GST (₹)"><Input id="s-price" type="number" min="0" step="1" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value as unknown as number })} required /></Field>
            <Field label="Duration (minutes)"><Input id="s-dur" type="number" min="5" step="5" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value as unknown as number })} required /></Field>
            <Field label="Description" className="col-span-2"><Textarea id="s-desc" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={pending}>Save service</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!archiving} onClose={() => setArchiving(null)} title="Archive this service?">
        <p className="text-ink-soft">{archiving?.name} will no longer appear when booking or billing. Past bills keep it.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setArchiving(null)}>Keep service</Button>
          <Button variant="danger" disabled={pending} onClick={async () => { if ((await run(() => archiveService(archiving!.id), 'Service archived')) !== false) setArchiving(null); }}>Archive service</Button>
        </div>
      </Modal>

      <Modal open={newCat !== null} onClose={() => setNewCat(null)} title="Add category">
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => addCategory(newCat ?? ''), 'Category added')) !== false) setNewCat(null); }}>
          <Field label="Category name"><Input id="cat-name" value={newCat ?? ''} onChange={(e) => setNewCat(e.target.value)} required placeholder="Bridal packages" /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setNewCat(null)}>Cancel</Button><Button type="submit" disabled={pending}>Add category</Button></div>
        </form>
      </Modal>
    </>
  );
}
