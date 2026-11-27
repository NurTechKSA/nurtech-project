import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { TuiLoader, TuiTitle } from '@taiga-ui/core';
import { TuiCardLarge } from '@taiga-ui/layout';

import { PermissionStore } from '@core/permissions/+store/permission.store';
import { ProjectPermission } from '@core/permissions/enums/project-permission.enum';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';

import { TaskStore } from '../../+store/task.store';
import { LinkType } from '../../enums/link-type.enum';
import { TaskType } from '../../enums/task-type.enum';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { TaskKeyComponent } from '../task-key/task-key.component';
import { TaskSubtaskListComponent } from '../task-subtask-list/task-subtask-list.component';
import { TaskTagsComponent } from '../task-tags/task-tags.component';
import { TaskTypeIconComponent } from '../task-type-icon/task-type-icon.component';
import { TaskCardActivityComponent } from './components/task-card-activity/task-card-activity.component';
import { TaskCardFieldsComponent } from './components/task-card-fields/task-card-fields.component';

const LINK_LABELS: Record<LinkType, string> = {
  [LinkType.BLOCKS]: 'Блокирует',
  [LinkType.BLOCKED_BY]: 'Заблокирована',
};

@Component({
  selector: 'app-task-card',
  imports: [
    RelativeDatePipe,
    TaskCardActivityComponent,
    TaskCardFieldsComponent,
    TaskKeyComponent,
    TaskTagsComponent,
    TaskTypeIconComponent,
    TuiCardLarge,
    TuiLoader,
    TuiTitle,
    TaskSubtaskListComponent,
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TaskStore],
})
export class TaskCardComponent {
  private readonly taskStore = inject(TaskStore);
  private readonly permissionStore = inject(PermissionStore);

  readonly taskKey = input<TaskDetail['key']>();

  readonly task = this.taskStore.task;
  readonly isLoading = this.taskStore.isLoading;

  readonly taskType = TaskType;
  readonly linkLabels = LINK_LABELS;

  readonly canCreateSubtask = computed(() =>
    this.permissionStore.hasPermission(ProjectPermission.TASK_CREATE)
  );

  constructor() {
    effect(() => {
      const key = this.taskKey();

      if (key) {
        this.taskStore.loadTask(key);
      }
    });
  }
}
