import { LinkedTask } from './linked-task.interface';

export type TaskParentRef = Omit<LinkedTask, 'status'>;
