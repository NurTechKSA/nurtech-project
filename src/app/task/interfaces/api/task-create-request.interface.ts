import { Priority } from '../../enums/priority.enum';
import { TaskType } from '../../enums/task-type.enum';

export interface TaskCreateRequest {
  type: TaskType;
  title: string;
  description?: string | null;
  statusId?: string | null;
  priority?: Priority | null;
  assigneeId?: string | null;
  reviewerId?: string | null;
  subsystemId?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  tagIds?: string[];
  parentId?: string | null;
}
