'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { CustomerForm, type StaffOption } from './customer-form';
import { archiveCustomer, type CustomerInput } from './actions';

export function NewCustomerButton({ staff }: { staff: StaffOption[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} />New client</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New client" wide>
        <CustomerForm staff={staff} onDone={(c) => { setOpen(false); if (c) router.push(`/customers/${c.id}`); }} />
      </Modal>
    </>
  );
}

export function EditCustomerButtons({ customer, staff, canArchive }: { customer: CustomerInput & { id: string }; staff: StaffOption[]; canArchive: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { run, pending } = useAction();
  const router = useRouter();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Edit profile</Button>
      {canArchive && <Button variant="danger" onClick={() => setConfirm(true)}>Archive</Button>}
      <Modal open={open} onClose={() => setOpen(false)} title="Edit client" wide>
        <CustomerForm initial={customer} staff={staff} onDone={() => setOpen(false)} />
      </Modal>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Archive this client?">
        <p className="text-ink-soft">{customer.name} will be hidden from client lists and booking. Their bills and history stay in reports.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>Keep client</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={async () => {
              if ((await run(() => archiveCustomer(customer.id), 'Client archived')) !== false) router.push('/customers');
            }}
          >
            Archive client
          </Button>
        </div>
      </Modal>
    </>
  );
}
