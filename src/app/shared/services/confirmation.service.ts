import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { defaultIfEmpty, Observable } from 'rxjs';

const DELETE_CONFIRM_DATA: TuiConfirmData = {
  yes: 'Удалить',
  no: 'Отмена',
  appearance: 'primary-destructive',
};

const DISCARD_CONFIRM_DATA: TuiConfirmData = {
  content: 'Введённые данные будут потеряны.',
  yes: 'Закрыть без сохранения',
  no: 'Остаться',
  appearance: ['secondary', 'primary'],
};

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly dialogService = inject(TuiDialogService);

  confirmDelete(question: string): Observable<boolean> {
    return this.openConfirmation(question, DELETE_CONFIRM_DATA);
  }

  confirmDiscard(question = 'Закрыть без сохранения?'): Observable<boolean> {
    return this.openConfirmation(question, DISCARD_CONFIRM_DATA);
  }

  private openConfirmation(
    question: string,
    data: TuiConfirmData
  ): Observable<boolean> {
    return this.dialogService
      .open<boolean>(TUI_CONFIRM, {
        label: question,
        size: 's',
        required: false,
        data,
      })
      .pipe(defaultIfEmpty(false));
  }
}
