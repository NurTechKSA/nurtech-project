import {
  createEnvironmentInjector,
  DestroyRef,
  EnvironmentInjector,
  inject,
  Injectable,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type TuiDialogOptions, TuiDialogService } from '@taiga-ui/core';
import { type TuiConfirmData, TuiConfirmService } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { defer, finalize, Observable, of, switchMap } from 'rxjs';

import { CreateTaskDialogStore } from '../+store/create-task-dialog.store';
import { TaskDetail } from '../interfaces/task-detail.interface';

const UNSAVED_CHANGES_CONFIRM: Partial<TuiDialogOptions<TuiConfirmData>> = {
  label: 'Закрыть без сохранения?',
  data: {
    content: 'Введённые данные будут потеряны.',
    yes: 'Закрыть без сохранения',
    no: 'Остаться',
  },
};

@Injectable()
export class CreateTaskDialogService {
  private readonly dialogService = inject(TuiDialogService);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);

  open(): Observable<TaskDetail> {
    // Редактор markdown тяжёлый, поэтому диалог загружается при первом открытии
    return defer(
      () =>
        import('../components/create-task-dialog/create-task-dialog.component')
    ).pipe(
      switchMap((module) => {
        // Стор и TuiConfirmService изолированы на одно открытие диалога
        const dialogInjector = createEnvironmentInjector(
          [CreateTaskDialogStore, TuiConfirmService],
          this.environmentInjector
        );
        const createTaskDialogStore = dialogInjector.get(CreateTaskDialogStore);
        const confirmService = dialogInjector.get(TuiConfirmService);

        // Во время отправки закрыть нельзя, изменённая форма спрашивает подтверждение
        const closable$ = defer(() =>
          createTaskDialogStore.isLoading()
            ? of(false)
            : confirmService.withConfirm(UNSAVED_CHANGES_CONFIRM)
        );

        return this.dialogService
          .open<TaskDetail>(
            new PolymorpheusComponent(
              module.CreateTaskDialogComponent,
              dialogInjector
            ),
            {
              label: 'Новая задача',
              size: 'l',
              // Имена опций задаёт Taiga, суффикс $ к ним не применить
              /* eslint-disable @smarttools/rxjs/finnish */
              closable: closable$,
              dismissible: closable$,
              /* eslint-enable @smarttools/rxjs/finnish */
            }
          )
          .pipe(
            finalize(() => {
              dialogInjector.destroy();
            })
          );
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }
}
