import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiScrollbar } from '@taiga-ui/core';

import { STATUS_COLORS } from '@status/config/status-colors.config';
import { StatusCategory } from '@status/enums/status-category.enum';

import { BoardColumnViewModel } from '../../interfaces/board-column-view-model.interface';
import { Board } from '../../interfaces/board.interface';

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
  readonly completedDays = input<Board['doneWindowDays']>();

  protected readonly statusCategory = StatusCategory;
  protected readonly accentColor = computed<string>(() => {
    const color = this.column().color;

    return color ? STATUS_COLORS[color] : 'var(--tui-status-neutral)';
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
