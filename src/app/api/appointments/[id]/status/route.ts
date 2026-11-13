import { route } from '@/app/api/_lib/handler';
import * as appointments from '@/server/features/appointments/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ p, b }) => appointments.setAppointmentStatus(p.id, String(b.status ?? '')));
