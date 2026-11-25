import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Observable } from 'rxjs';

import { ChangePasswordDialogComponent } from '../components/change-password-dialog/change-password-dialog.component';

@Injectable()
export class ChangePasswordDialogService {
  private readonly dialogService = inject(TuiDialogService);

  open(): Observable<void> {
    return this.dialogService.open(
      new PolymorpheusComponent(ChangePasswordDialogComponent),
      {
        label: 'Смена пароля',
        size: 's',
      }
    );
  }
}
