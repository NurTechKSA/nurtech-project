import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { defaultIfEmpty, Observable } from 'rxjs';

import { UnsavedDialogComponent } from '@shared/components/unsaved-dialog/unsaved-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class UnsavedDialogService {
  private readonly tuiDialogService = inject(TuiDialogService);

  open(): Observable<boolean> {
    return this.tuiDialogService
      .open<boolean>(new PolymorpheusComponent(UnsavedDialogComponent), {
        size: 'm',
        label: 'Несохранённые изменения',
        dismissible: true,
        closable: true,
      })
      .pipe(defaultIfEmpty(false));
  }
}
