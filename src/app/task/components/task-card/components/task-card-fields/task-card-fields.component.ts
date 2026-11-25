import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DurationPipe } from '@shared/pipes/duration.pipe';

import { TaskDetail } from '../../../../interfaces/task-detail.interface';
import { TaskKeyComponent } from '../../../task-key/task-key.component';
import { TaskPriorityBadgeComponent } from '../../../task-priority-badge/task-priority-badge.component';
import { TaskStatusBadgeComponent } from '../../../task-status-badge/task-status-badge.component';

@Component({
  selector: 'app-task-card-fields',
  imports: [
    DatePipe,
    DurationPipe,
    TaskKeyComponent,
    TaskPriorityBadgeComponent,
    TaskStatusBadgeComponent,
    TitleCasePipe,
  ],
  templateUrl: './task-card-fields.component.html',
  styleUrl: './task-card-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardFieldsComponent {
  readonly task = input.required<TaskDetail>();
}
