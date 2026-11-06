import { IdName } from './id-name.interface';
import { SubtaskItem } from './subtask-item.interface';
import { TaskLink } from './task-link.interface';
import { TaskParentRef } from './task-parent-ref.interface';
import { TaskSearchItem } from './task-search-item.interface';
import { TaskUrl } from './task-url.interface';
import { UserRef } from './user-ref.interface';
import { Priority } from '../enums/priority.enum';

export interface TaskDetail extends TaskSearchItem {
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
