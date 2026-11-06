import { TaskSearchItem } from './task-search-item.interface';

export type LinkedTask = Omit<TaskSearchItem, 'type'>;
