import { TaskDetail } from '../../task/interfaces/task-detail.interface';
import { TaskParentRef } from '../../task/interfaces/task-parent-ref.interface';

export interface BoardCard extends Pick<
  TaskDetail,
  | 'id'
  | 'key'
  | 'type'
  | 'title'
  | 'priority'
  | 'dueDate'
  | 'isOverdue'
  | 'assignee'
  | 'tags'
  | 'blocked'
> {
  parent: Pick<TaskParentRef, 'id' | 'key'> | null;
  rank: string;
}
