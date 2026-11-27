import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

import { Board } from '../../interfaces/board.interface';

@Component({
  selector: 'app-board-toolbar',
  imports: [TuiIcon],
  templateUrl: './board-toolbar.component.html',
  styleUrl: './board-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardToolbarComponent {
  readonly boardName = input<Board['name'] | null>();
}
