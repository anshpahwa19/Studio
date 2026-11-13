import { call, type DataOf } from '@/client/api-client';
import type * as s from '@/server/features/appointments/service';
export type { BookInput } from '@/server/features/appointments/service';

export const bookAppointment = (i: s.BookInput) => call<DataOf<typeof s.bookAppointment>>('POST', '/appointments', i);
export const setAppointmentStatus = (id: string, status: string) => call('POST', `/appointments/${id}/status`, { status });
export const rescheduleAppointment = ({ id, ...rest }: Parameters<typeof s.rescheduleAppointment>[0]) => call('PUT', `/appointments/${id}`, rest);
