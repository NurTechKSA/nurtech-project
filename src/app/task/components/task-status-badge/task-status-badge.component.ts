import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiBadge, TuiStatus } from '@taiga-ui/kit';

import { STATUS_COLORS } from '@status/config/status-colors.config';

import { StatusRef } from '../../interfaces/status-ref.interface';

@Component({
  selector: 'app-task-status-badge',
  imports: [TuiBadge, TuiStatus],
  templateUrl: './task-status-badge.component.html',
  styleUrl: './task-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskStatusBadgeComponent {
  readonly status = input.required<StatusRef>();

  readonly dotColors = STATUS_COLORS;
}
