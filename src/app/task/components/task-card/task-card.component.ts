import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TuiTitle } from '@taiga-ui/core';
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
import { TaskTagsComponent } from '../task-tags/task-tags.component';
import { TaskTypeIconComponent } from '../task-type-icon/task-type-icon.component';

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
    TuiTitle,
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TaskStore],
})
export class TaskCardComponent {
  private readonly taskStore = inject(TaskStore);
  private readonly loadParams = computed(() => ({
    projectId: this.projectId(),
    key: this.taskKey(),
  }));

  readonly projectId = input.required<Project['id']>();
  readonly taskKey = input.required<TaskDetail['key']>();

  readonly task = this.taskStore.task;
  readonly taskType = TaskType;
  readonly linkLabels = LINK_LABELS;

  constructor() {
    this.taskStore.loadTask(this.loadParams);
  }
}
