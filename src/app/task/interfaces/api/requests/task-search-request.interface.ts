import { TaskType } from '../../../enums/task-type.enum';
import { TaskDetail } from '../../task-detail.interface';

export interface TaskSearchRequest {
  q?: string;
  types?: TaskType[];
  excludeId?: TaskDetail['id'];
  limit?: number;
}
