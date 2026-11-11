import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiHint } from '@taiga-ui/core';

import { Priority } from '../../enums/priority.enum';

interface PriorityConfigItem {
  letter: string;
  name: string;
  className: string;
}

const PRIORITY_CONFIG: Record<Priority, PriorityConfigItem> = {
  [Priority.LOW]: {
    letter: 'L',
    name: 'Low',
    className: 'badge-low',
  },
  [Priority.MEDIUM]: {
    letter: 'M',
    name: 'Medium',
    className: 'badge-medium',
  },
  [Priority.HIGH]: {
    letter: 'H',
    name: 'High',
    className: 'badge-high',
  },
  [Priority.CRITICAL]: {
    letter: 'C',
    name: 'Critical',
    className: 'badge-critical',
  },
};

@Component({
  selector: 'app-priority-badge',
  imports: [TuiHint],
  templateUrl: './priority-badge.component.html',
  styleUrl: './priority-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityBadgeComponent {
  readonly priority = input.required<Priority>();
  protected readonly priorityConfig = computed(
    () => PRIORITY_CONFIG[this.priority()]
  );
}
