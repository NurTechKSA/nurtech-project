import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiHint } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { Priority } from '../../enums/priority.enum';

interface PriorityConfigItem {
  letter: string;
  bgColor: string;
}

const PRIORITY_CONFIG: Record<Priority, PriorityConfigItem> = {
  [Priority.LOW]: {
    letter: 'L',
    bgColor: 'var(--tui-status-positive)',
  },
  [Priority.MEDIUM]: {
    letter: 'M',
    bgColor: 'var(--tui-status-warning)',
  },
  [Priority.HIGH]: {
    letter: 'H',
    bgColor: 'var(--tui-background-accent-2)',
  },
  [Priority.CRITICAL]: {
    letter: 'C',
    bgColor: 'var(--tui-status-negative)',
  },
};

@Component({
  selector: 'app-priority-badge',
  imports: [TuiHint, TuiBadge],
  templateUrl: './task-priority-badge.component.html',
  styleUrl: './task-priority-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPriorityBadgeComponent {
  readonly priority = input.required<Priority>();
  readonly data = PRIORITY_CONFIG;
}
