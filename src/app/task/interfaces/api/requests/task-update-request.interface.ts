import { Priority } from '../../../enums/priority.enum';
import { TaskType } from '../../../enums/task-type.enum';

export interface TaskUpdateRequest {
  title?: string;
  description?: string | null;
  type?: TaskType.TASK | TaskType.BUG;
  priority?: Priority;
  assigneeId?: string | null;
  reviewerId?: string | null;
  subsystemId?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  tagIds?: string[];
}
