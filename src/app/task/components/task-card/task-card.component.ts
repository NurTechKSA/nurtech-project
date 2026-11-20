import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TuiTitle } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';

import { Project } from '@core/project/interfaces/project.interface';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';

import { TaskStore } from '../../+store/task.store';
import { LinkType } from '../../enums/link-type.enum';
import { TaskType } from '../../enums/task-type.enum';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { TaskCardActivityComponent } from '../task-card-activity/task-card-activity.component';
import { TaskCardFieldsComponent } from '../task-card-fields/task-card-fields.component';
import { TaskKeyComponent } from '../task-key/task-key.component';
import { TaskTypeIconComponent } from '../task-type-icon/task-type-icon.component';

@Component({
  selector: 'app-task-card',
  imports: [
    TuiTitle,
    TuiBadge,
    TuiCardLarge,
    RelativeDatePipe,
    TaskCardActivityComponent,
    TaskCardFieldsComponent,
    TaskKeyComponent,
    TaskTypeIconComponent,
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TaskStore],
})
export class TaskCardComponent {
  private readonly taskStore = inject(TaskStore);

  readonly projectId = input.required<Project['id']>();
  readonly taskKey = input.required<TaskDetail['key']>();
  readonly task = this.taskStore.task;
  readonly taskType = TaskType;
  readonly linkLabels: Record<LinkType, string> = {
    [LinkType.BLOCKS]: 'Блокирует',
    [LinkType.BLOCKED_BY]: 'Заблокирована',
  };

  constructor() {
    this.taskStore.loadTask(() => ({
      projectId: this.projectId(),
      key: this.taskKey(),
    }));
  }
}
