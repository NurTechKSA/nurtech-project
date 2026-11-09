import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiBadge, TuiStatus } from '@taiga-ui/kit';

import { StatusColor } from '../../enums/status-color.enum';
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

  readonly dotColor = computed(() => {
    switch (this.status().color) {
      case StatusColor.GREEN:
        return 'var(--tui-status-positive)';
      case StatusColor.RED:
        return 'var(--tui-status-negative)';
      case StatusColor.YELLOW:
        return 'var(--tui-status-warning)';
      case StatusColor.BLUE:
        return 'var(--tui-status-info)';
      case StatusColor.GRAY:
        return 'var(--tui-status-neutral)';
      case StatusColor.CYAN:
        return 'var(--tui-chart-categorical-16)';
      case StatusColor.ORANGE:
        return 'var(--tui-chart-categorical-08)';
      case StatusColor.PURPLE:
        return 'var(--tui-chart-categorical-10)';
    }
  });
}
