import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { TuiTabs } from '@taiga-ui/kit';

import { DurationPipe } from '@shared/pipes/duration.pipe';

import { TaskDetail } from '../../../../interfaces/task-detail.interface';

enum TaskCardTab {
  COMMENTS = 0,
  WORKLOGS = 1,
  HISTORY = 2,
}

@Component({
  selector: 'app-task-card-activity',
  imports: [TuiTabs, DurationPipe],
  templateUrl: './task-card-activity.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardActivityComponent {
  readonly task = input.required<TaskDetail>();
  readonly activeTab = signal(TaskCardTab.COMMENTS);
  readonly tab = TaskCardTab;
}
