import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { defaultIfEmpty, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly dialogs = inject(TuiDialogService);

  confirm(question: string): Observable<boolean> {
    const data: TuiConfirmData = {
      yes: 'Удалить',
      no: 'Отмена',
      appearance: 'primary-destructive',
    };

    return this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: question,
        size: 's',
        required: false,
        data,
      })
      .pipe(defaultIfEmpty(false));
  }
}
