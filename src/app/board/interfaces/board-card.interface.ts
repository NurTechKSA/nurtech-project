import { BoardCardAssignee } from './board-card-assignee.interface';
import { BoardCardParent } from './board-card-parent.interface';
import { BoardCardTag } from './board-card-tag.interface';

export interface BoardCard {
  id: string;
  key: string;
  type: 'task' | 'bug' | 'subtask';
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string | null;
  isOverdue: boolean;
  assignee: BoardCardAssignee | null;
  tags: BoardCardTag[];
  parent: BoardCardParent | null;
  blocked: boolean;
  rank: string;
}
