import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

@Component({
  imports: [TuiButton],
  templateUrl: './unsaved-dialog.component.html',
  styleUrl: './unsaved-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnsavedDialogComponent {
  private readonly context = injectContext<TuiDialogContext<boolean>>();

  protected onStayClick(): void {
    this.context.completeWith(false);
  }

  protected onDiscardClick(): void {
    this.context.completeWith(true);
  }
}
