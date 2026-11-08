import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { defaultIfEmpty, Observable } from 'rxjs';

const DELETE_CONFIRM_DATA: TuiConfirmData = {
  yes: 'Удалить',
  no: 'Отмена',
  appearance: 'primary-destructive',
};

const UNSAVED_CHANGES_CONFIRM_DATA: TuiConfirmData = {
  content: 'Введённые данные будут потеряны.',
  yes: 'Закрыть без сохранения',
  no: 'Остаться',
};

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly dialogService = inject(TuiDialogService);

  confirmDelete(question: string): Observable<boolean> {
    return this.openConfirmation(question, DELETE_CONFIRM_DATA);
  }

  confirmUnsavedChanges(): Observable<boolean> {
    return this.openConfirmation(
      'Закрыть без сохранения?',
      UNSAVED_CHANGES_CONFIRM_DATA
    );
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
