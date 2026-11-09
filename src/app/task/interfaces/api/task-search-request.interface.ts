import { TaskType } from '../../enums/task-type.enum';

export interface TaskSearchRequest {
  q?: string | null;
  types?: TaskType[] | null;
  excludeId?: string | null;
  limit?: number | null;
}
