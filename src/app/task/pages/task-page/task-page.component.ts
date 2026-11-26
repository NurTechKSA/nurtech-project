import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskDetail } from '../../interfaces/task-detail.interface';

@Component({
  imports: [TaskCardComponent],
  templateUrl: './task-page.component.html',
  styleUrl: './task-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPageComponent {
  readonly taskKey = input<TaskDetail['key']>();
}
