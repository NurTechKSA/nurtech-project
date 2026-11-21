import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiScrollbar } from '@taiga-ui/core';

import { StatusCategory } from '@status/enums/status-category.enum';

import { BoardColumnViewModel } from '../../interfaces/board-column-view-model.interface';

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

  statusCategory = StatusCategory;
}
