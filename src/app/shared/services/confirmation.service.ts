import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';
import { defaultIfEmpty, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService {
  private readonly dialogService: TuiDialogService = inject(TuiDialogService);

  confirmUnsavedChanges(): Observable<boolean> {
    return this.openConfirmDialog('Закрыть без сохранения?', {
      content: 'Введённые данные будут потеряны.',
      yes: 'Закрыть без сохранения',
      no: 'Остаться',
    });
  }

  private openConfirmDialog(
    label: string,
    data: TuiConfirmData
  ): Observable<boolean> {
    return this.dialogService
      .open<boolean>(TUI_CONFIRM, {
        label,
        data,
      })
      .pipe(defaultIfEmpty(false));
  }
}
