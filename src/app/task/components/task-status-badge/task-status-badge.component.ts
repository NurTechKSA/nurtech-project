import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiBadge, TuiStatus } from '@taiga-ui/kit';

import { StatusColor } from '../../enums/status-color.enum';
import { StatusRef } from '../../interfaces/status-ref.interface';

const STATUS_DOT_COLORS: Record<StatusColor, string> = {
  [StatusColor.GREEN]: 'var(--tui-status-positive)',
  [StatusColor.RED]: 'var(--tui-status-negative)',
  [StatusColor.YELLOW]: 'var(--tui-status-warning)',
  [StatusColor.BLUE]: 'var(--tui-status-info)',
  [StatusColor.GRAY]: 'var(--tui-status-neutral)',
  [StatusColor.CYAN]: 'var(--tui-chart-categorical-16)',
  [StatusColor.ORANGE]: 'var(--tui-chart-categorical-08)',
  [StatusColor.PURPLE]: 'var(--tui-chart-categorical-10)',
};

@Component({
  selector: 'app-task-status-badge',
  imports: [TuiBadge, TuiStatus],
  templateUrl: './task-status-badge.component.html',
  styleUrl: './task-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskStatusBadgeComponent {
  readonly status = input.required<StatusRef>();

  readonly dotColors = STATUS_DOT_COLORS;
}
