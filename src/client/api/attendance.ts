import { call } from '@/client/api/call';
import type * as s from '@/server/features/attendance/service';

export const punchIn = (i: Parameters<typeof s.punchIn>[0]) => call('POST', '/attendance/punch-in', i);
export const punchOut = (i: Parameters<typeof s.punchOut>[0]) => call('POST', '/attendance/punch-out', i);
export const saveTimes = (i: Parameters<typeof s.saveTimes>[0]) => call('PUT', '/attendance', i);
