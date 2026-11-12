'use client';
import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { toast } from '@/components/toast';
import { importCustomers, type ImportResult } from './actions';

export function BulkButtons({ downloadHref, canEdit }: { downloadHref: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { run, pending } = useAction();
  const close = () => { setOpen(false); setCsv(null); setResult(null); };

  return (
    <>
      <a href={downloadHref} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas"><Download size={15} />Download CSV</a>
      {canEdit && <Button variant="secondary" onClick={() => setOpen(true)}><Upload size={15} />Bulk upload</Button>}
      <Modal open={open} onClose={close} title="Bulk upload clients">
        <div className="space-y-4">
          <p className="text-ink-soft">Upload a CSV with the columns <b>Name, Mobile, Email, Gender, Branch, Preferred stylist, Notes</b>. Only Name and Mobile are required; everything else can be left blank. A mobile number that already exists updates that client instead of adding a new one.</p>
          <a href="/customers/export?template=1" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-violet-600 hover:underline"><Download size={14} />Download the template</a>
          <input type="file" accept=".csv,text/csv" aria-label="CSV file" className="block w-full text-[13.5px] file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-2"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setResult(null);
              if (!file) return setCsv(null);
              if (file.size > 2_000_000) { toast.error('That file is too large. Upload at most 2,000 clients at a time.'); e.target.value = ''; return setCsv(null); }
              setCsv({ name: file.name, text: await file.text() });
            }} />
          {result && (
            <div className="rounded-lg border border-line p-3 text-[13.5px]">
              <div className="font-medium">{result.added} added · {result.updated} updated · {result.errors.length} skipped</div>
              {result.errors.length > 0 && <ul className="mt-2 max-h-44 list-disc space-y-0.5 overflow-y-auto pl-5 text-red-700">{result.errors.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>{result ? 'Done' : 'Cancel'}</Button>
            <Button disabled={!csv || pending} onClick={async () => { const r = await run(() => importCustomers(csv!.text)); if (r) setResult(r); }}>{pending ? 'Uploading…' : 'Upload clients'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
