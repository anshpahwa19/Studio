import { route } from '@/app/api/_lib/handler';
import * as appointments from '@/server/features/appointments/service';
import * as appointmentsReads from '@/server/features/appointments/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => appointmentsReads.listAppointments(q));
export const POST = route(({ b }) => appointments.bookAppointment(b));
