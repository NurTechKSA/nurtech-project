import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { defaultIfEmpty, Observable } from 'rxjs';

const DELETE_CONFIRM_DATA: TuiConfirmData = {
  yes: 'Удалить',
  no: 'Отмена',
  appearance: 'primary-destructive',
};

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly tuiDialogService = inject(TuiDialogService);

  confirmDelete(question: string): Observable<boolean> {
    return this.tuiDialogService
      .open<boolean>(TUI_CONFIRM, {
        label: question,
        size: 's',
        required: false,
        data: DELETE_CONFIRM_DATA,
      })
      .pipe(defaultIfEmpty(false));
  }
}
