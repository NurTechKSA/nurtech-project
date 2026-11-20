import { inject, Injectable, Injector, signal } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  defaultIfEmpty,
  defer,
  finalize,
  from,
  Observable,
  of,
  switchMap,
} from 'rxjs';

import { ConfirmationService } from '@shared/services/confirmation.service';

import { CreateTaskDialogContextData } from '../interfaces/create-task-dialog-context.interface';
import { CreateTaskDialogData } from '../interfaces/create-task-dialog-data.interface';
import { TaskDetail } from '../interfaces/task-detail.interface';

@Injectable()
export class CreateTaskDialogService {
  private readonly injector = inject(Injector);
  private readonly dialogService = inject(TuiDialogService);
  private readonly confirmationService = inject(ConfirmationService);

  open(data: CreateTaskDialogData = {}): Observable<TaskDetail | null> {
    const isDirty = signal(false);
    const isConfirming = signal(false);

    const canClose$ = defer(() => {
      if (!isDirty()) {
        return of(true);
      }

      if (isConfirming()) {
        return of(false);
      }

      isConfirming.set(true);

      return this.confirmationService.confirmDiscard().pipe(
        finalize(() => {
          isConfirming.set(false);
        })
      );
    });

    const contextData: CreateTaskDialogContextData = {
      ...data,
      isDirty,
      canClose$,
    };

    return from(
      import('../components/create-task-dialog/create-task-dialog.component')
    ).pipe(
      switchMap(({ CreateTaskDialogComponent: component }) =>
        this.dialogService.open<TaskDetail | null>(
          new PolymorpheusComponent(component, this.injector),
          {
            label: 'Новая задача',
            size: null,
            dismissible: false,
            // Внешний контракт TuiDialogOptions требует ключ closable
            // eslint-disable-next-line @smarttools/rxjs/finnish
            closable: canClose$,
            data: contextData,
          }
        )
      ),
      defaultIfEmpty(null)
    );
  }
}
