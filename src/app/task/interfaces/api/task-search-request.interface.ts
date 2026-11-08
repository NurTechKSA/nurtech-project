import { TaskType } from '../../enums/task-type.enum';

export interface TaskSearchRequest {
  q?: string | null;
  types?: TaskType | null;
  excludeId?: number | null;
  limit?: number | null;
}
