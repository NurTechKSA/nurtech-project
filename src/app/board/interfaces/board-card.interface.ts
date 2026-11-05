import { BoardCardAssignee } from './board-card-assignee.interface';
import { BoardCardParent } from './board-card-parent.interface';
import { BoardCardTag } from './board-card-tag.interface';
import { Priority } from '../../task/enums/priority.enum';
import { TaskType } from '../../task/enums/task-type.enum';

export interface BoardCard {
  id: string;
  key: string;
  type: TaskType;
  title: string;
  priority: Priority;
  dueDate: string | null;
  isOverdue: boolean;
  assignee: BoardCardAssignee | null;
  tags: BoardCardTag[];
  parent: BoardCardParent | null;
  blocked: boolean;
  rank: string;
}
