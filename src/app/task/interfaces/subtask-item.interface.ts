import { LinkedTask } from './linked-task.interface';
import { UserRef } from './user-ref.interface';

export interface SubtaskItem extends LinkedTask {
  assignee: UserRef | null;
}
