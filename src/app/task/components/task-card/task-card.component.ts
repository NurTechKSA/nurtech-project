import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import { TuiLoader, TuiTitle } from '@taiga-ui/core';
import { TuiCardLarge } from '@taiga-ui/layout';

import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';

import { TaskStore } from '../../+store/task.store';
import { LinkType } from '../../enums/link-type.enum';
import { TaskType } from '../../enums/task-type.enum';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { TaskKeyComponent } from '../task-key/task-key.component';
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
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TaskStore],
})
export class TaskCardComponent {
  private readonly taskStore = inject(TaskStore);

  readonly taskKey = input<TaskDetail['key']>();

  readonly task = this.taskStore.task;
  readonly isLoading = this.taskStore.isLoading;

  readonly taskType = TaskType;
  readonly linkLabels = LINK_LABELS;

  constructor() {
    effect(() => {
      const key = this.taskKey();

      if (key) {
        this.taskStore.loadTask(key);
      }
    });
  }
}
