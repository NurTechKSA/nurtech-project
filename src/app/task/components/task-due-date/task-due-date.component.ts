import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

import { dayjs } from '@shared/config/dayjs.config';

import { TaskDetail } from '../../interfaces/task-detail.interface';

@Component({
  selector: 'app-task-due-date',
  imports: [TuiIcon],
  templateUrl: './task-due-date.component.html',
  styleUrl: './task-due-date.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDueDateComponent {
  readonly dueDate = input.required<TaskDetail['dueDate']>();
  readonly isOverdue = input.required<TaskDetail['isOverdue']>();

  protected readonly formattedDate = computed(() => {
    const dueDate = this.dueDate();

    return dueDate ? dayjs(dueDate).format('D MMM') : '';
  });
}
