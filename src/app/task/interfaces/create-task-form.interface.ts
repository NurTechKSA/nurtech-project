import { FormControl } from '@angular/forms';
import { TuiDay } from '@taiga-ui/cdk';

import { Status } from '@status/interfaces/status.interface';

import { TaskParentRef } from './task-parent-ref.interface';
import { Member } from '../../dictionary/interfaces/member.interface';
import { Subsystem } from '../../dictionary/interfaces/subsystem.interface';
import { Tag } from '../../dictionary/interfaces/tag.interface';
import { Priority } from '../enums/priority.enum';
import { TaskType } from '../enums/task-type.enum';

export interface CreateTaskForm {
  type: FormControl<TaskType>;
  title: FormControl<string>;
  description: FormControl<string>;
  parent: FormControl<TaskParentRef | null>;
  statusId: FormControl<Status['id'] | null>;
  priority: FormControl<Priority>;
  assigneeId: FormControl<Member['userId'] | null>;
  reviewerId: FormControl<Member['userId'] | null>;
  subsystemId: FormControl<Subsystem['id'] | null>;
  dueDate: FormControl<TuiDay | null>;
  estimate: FormControl<string>;
  tagIds: FormControl<Tag['id'][]>;
}
