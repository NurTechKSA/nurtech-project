import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-board-toolbar',
  imports: [TuiIcon],
  templateUrl: './board-toolbar.component.html',
  styleUrl: './board-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BoardToolbarComponent {}
