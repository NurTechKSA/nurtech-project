import { UserRef } from '@core/user/interfaces/user-ref.interface';

import { StatusRef } from './status-ref.interface';

export interface SubtaskItem {
  id: string;
  key: string;
  title: string;
  status: StatusRef;
  assignee: UserRef | null;
}
