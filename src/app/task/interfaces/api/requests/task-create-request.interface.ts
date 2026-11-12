import { UserRef } from '@core/user/interfaces/user-ref.interface';

import { Priority } from '../../../enums/priority.enum';
import { TaskType } from '../../../enums/task-type.enum';
import { IdName } from '../../id-name.interface';
import { Status } from '../../status.interface';
import { TaskDetail } from '../../task-detail.interface';

export interface TaskCreateRequest {
  type: TaskType;
  title: string;
  description?: string | null;
  statusId?: Status['id'] | null;
  priority?: Priority | null;
  assigneeId?: UserRef['userId'] | null;
  reviewerId?: UserRef['userId'] | null;
  subsystemId?: IdName['id'] | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  tagIds?: IdName['id'][];
  parentId?: TaskDetail['id'] | null;
}
