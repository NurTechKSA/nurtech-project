import { StatusRef } from './status-ref.interface';
import { TaskType } from '../enums/task-type.enum';

export interface TaskSearchItem {
  id: string;
  key: string;
  type: TaskType;
  title: string;
  status: StatusRef;
}
