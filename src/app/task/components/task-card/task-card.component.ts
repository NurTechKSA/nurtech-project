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

import { CopyButtonComponent } from '@shared/components/copy-button/copy-button.component';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';
import { NotificationService } from '@shared/services/notification.service';

import { TaskStore } from '../../+store/task.store';
import { LinkType } from '../../enums/link-type.enum';
import { TaskType } from '../../enums/task-type.enum';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { getTaskUrl } from '../../utils/task-url.util';
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
    CopyButtonComponent,
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
  private readonly notificationService = inject(NotificationService);
  private readonly taskStore = inject(TaskStore);

  readonly taskKey = input<TaskDetail['key']>();

  readonly task = this.taskStore.task;
  readonly isLoading = this.taskStore.isLoading;

  readonly taskType = TaskType;
  readonly linkLabels = LINK_LABELS;

  protected readonly taskUrl = computed(() => {
    const task = this.task();

    return task ? new URL(getTaskUrl(task.key), location.origin).href : '';
  });

  constructor() {
    effect(() => {
      const key = this.taskKey();

      if (key) {
        this.taskStore.loadTask(key);
      }
    });
  }

  protected onCopyLinkClick(): void {
    this.notificationService.showSuccess('Ссылка скопирована');
  }
}
