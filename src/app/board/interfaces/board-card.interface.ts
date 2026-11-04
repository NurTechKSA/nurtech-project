export interface BoardCard {
  id: string;
  key: string;
  type: 'task' | 'bug' | 'subtask';
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string | null;
  isOverdue: boolean;
  assignee: {
    userId: string;
    name: string;
    username: string;
  } | null;
  tags: {
    id: string;
    name: string;
  }[];
  parent: {
    id: string;
    key: string;
  } | null;
  blocked: boolean;
  rank: string;
}
