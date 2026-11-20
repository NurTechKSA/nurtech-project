import { Status } from '@status/interfaces/status.interface';

import { TaskParentRef } from './task-parent-ref.interface';
import { TaskType } from '../enums/task-type.enum';

export interface CreateTaskDialogData {
  type?: TaskType;
  statusId?: Status['id'] | null;
  parent?: TaskParentRef | null;
}
