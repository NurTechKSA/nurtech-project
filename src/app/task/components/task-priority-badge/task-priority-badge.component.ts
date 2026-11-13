import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiHint } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { Priority } from '../../enums/priority.enum';

interface PriorityConfigItem {
  letter: string;
  name: string;
  backgroundColor: string;
}

const PRIORITY_CONFIG: Record<Priority, PriorityConfigItem> = {
  [Priority.LOW]: {
    letter: 'L',
    name: 'Low',
    backgroundColor: '#4dd269',
  },
  [Priority.MEDIUM]: {
    letter: 'M',
    name: 'Medium',
    backgroundColor: '#e0a100',
  },
  [Priority.HIGH]: {
    letter: 'H',
    name: 'High',
    backgroundColor: '#e07b00',
  },
  [Priority.CRITICAL]: {
    letter: 'C',
    name: 'Critical',
    backgroundColor: '#f45d48',
  },
};

@Component({
  selector: 'app-priority-badge',
  imports: [TuiHint, TuiBadge],
  templateUrl: './task-priority-badge.component.html',
  styleUrl: './task-priority-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityBadgeComponent {
  readonly priority = input.required<Priority>();
  readonly data = PRIORITY_CONFIG;
}
