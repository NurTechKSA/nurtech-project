export interface Status {
  id: string;
  name: string;
  color:
    'gray' | 'blue' | 'cyan' | 'green' | 'yellow' | 'orange' | 'red' | 'purple';
  category: 'backlog' | 'todo' | 'in_progress' | 'done';
  requiresReason: boolean;
}
