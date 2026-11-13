import { route } from '@/app/api/_lib/handler';
import * as appointments from '@/server/features/appointments/service';
import * as appointmentsReads from '@/server/features/appointments/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => appointmentsReads.getAppointment(p.id));
export const PUT = route(({ p, b }) => appointments.rescheduleAppointment({ ...b, id: p.id }));
