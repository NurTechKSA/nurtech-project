import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiButton, TuiHint } from '@taiga-ui/core';
import { TuiButtonCopy } from '@taiga-ui/kit';

@Component({
  selector: 'app-copy-button',
  imports: [TuiButton, TuiButtonCopy, TuiHint],
  templateUrl: './copy-button.component.html',
  styleUrl: './copy-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent {
  readonly text = input.required<string>();
  readonly label = input('Копировать');
}
