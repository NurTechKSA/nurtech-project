import { TaskDetail } from './task-detail.interface';

export type TaskSearchItem = Pick<
  TaskDetail,
  'id' | 'key' | 'type' | 'title' | 'status'
>;
