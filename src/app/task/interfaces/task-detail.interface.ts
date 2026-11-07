import { UserRef } from '@core/user/interfaces/user-ref.interface';

import { IdName } from './id-name.interface';
import { StatusRef } from './status-ref.interface';
import { SubtaskItem } from './subtask-item.interface';
import { TaskLink } from './task-link.interface';
import { TaskParentRef } from './task-parent-ref.interface';
import { TaskUrl } from './task-url.interface';
import { Priority } from '../enums/priority.enum';
import { TaskType } from '../enums/task-type.enum';

export interface TaskDetail {
  id: string;
  key: string;
  type: TaskType;
  title: string;
  status: StatusRef;
  description: string | null;
  priority: Priority;
  assignee: UserRef | null;
  reviewer: UserRef | null;
  reporter: UserRef;
  subsystem: IdName | null;
  tags: IdName[];
  dueDate: string | null;
  isOverdue: boolean;
  estimateMinutes: number | null;
  spentMinutes: number;
  parent: TaskParentRef | null;
  blocked: boolean;
  commentCount: number;
  subtasks: SubtaskItem[];
  subtasksEstimateMinutes: number;
  subtasksSpentMinutes: number;
  links: TaskLink[];
  urls: TaskUrl[];
  createdAt: string;
  updatedAt: string;
}
