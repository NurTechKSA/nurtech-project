import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiTitle } from '@taiga-ui/core';
import { TuiProgressBar } from '@taiga-ui/kit';

import { UserAvatarComponent } from '@shared/components/user-avatar/user-avatar.component';
import { StatusCategory } from '@status/enums/status-category.enum';

import { SubtaskItem } from '../../interfaces/subtask-item.interface';
import { TaskKeyComponent } from '../task-key/task-key.component';
import { TaskStatusBadgeComponent } from '../task-status-badge/task-status-badge.component';

@Component({
  selector: 'app-task-subtask-list',
  imports: [
    TaskKeyComponent,
    TaskStatusBadgeComponent,
    UserAvatarComponent,
    TuiProgressBar,
    TuiTitle,
  ],
  templateUrl: './task-subtask-list.component.html',
  styleUrl: './task-subtask-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskSubtaskListComponent {
  readonly subtasks = input.required<SubtaskItem[]>();
  readonly doneCount = computed(
    () =>
      this.subtasks().filter(
        (subtask) => subtask.status.category === StatusCategory.DONE
      ).length
  );
}
