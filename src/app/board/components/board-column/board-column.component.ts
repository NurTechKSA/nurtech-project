import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiScrollbar } from '@taiga-ui/core';

import { StatusCategory } from '@status/enums/status-category.enum';
import { StatusColor } from '@status/enums/status-color.enum';

import { BoardColumnViewModel } from '../../interfaces/board-column-view-model.interface';

const STATUS_ACCENT_COLORS: Record<StatusColor, string> = {
  [StatusColor.GREEN]: 'var(--tui-status-positive)',
  [StatusColor.RED]: 'var(--tui-status-negative)',
  [StatusColor.YELLOW]: 'var(--tui-status-warning)',
  [StatusColor.BLUE]: 'var(--tui-status-info)',
  [StatusColor.GRAY]: 'var(--tui-status-neutral)',
  [StatusColor.CYAN]: 'var(--tui-chart-categorical-16)',
  [StatusColor.ORANGE]: 'var(--tui-chart-categorical-08)',
  [StatusColor.PURPLE]: 'var(--tui-chart-categorical-10)',
};

const RU_PLURAL_RULES = new Intl.PluralRules('ru');
const DAY_FORMS: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'день',
  few: 'дня',
};

@Component({
  selector: 'app-board-column',
  imports: [TuiScrollbar],
  templateUrl: './board-column.component.html',
  styleUrl: './board-column.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardColumnComponent {
  readonly column = input.required<BoardColumnViewModel>();
  readonly completedDays = input<number>();

  protected readonly statusCategory = StatusCategory;
  protected readonly accentColor = computed<string>(() => {
    const color = this.column().color;

    return color ? STATUS_ACCENT_COLORS[color] : 'var(--tui-status-neutral)';
  });

  protected readonly completedDaysLabel = computed<string>(() => {
    const days = this.completedDays();

    if (!days) {
      return '';
    }

    const form = DAY_FORMS[RU_PLURAL_RULES.select(days)] ?? 'дней';

    return `закрытые за ${String(days)} ${form}`;
  });
}
