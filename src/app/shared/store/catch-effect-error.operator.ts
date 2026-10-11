import { updateState } from '@angular-architects/ngrx-toolkit';
import { WritableStateSource } from '@ngrx/signals';
import { catchError, EMPTY, Observable, repeat } from 'rxjs';

import { setError } from './status-update.util';
import { LoadingStatus } from '../enums/loading-status.enum';

interface CatchEffectParams<K extends string> {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  store: WritableStateSource<Record<K, LoadingStatus | unknown>>;
  methodName: string;
  statusKey?: K;
}

/**
 * Решает проблему завершения потока в эффектах NGRX SIGNAL STORE
 *
 * Необходимо как при использовании множества операторов высшего порядка,
 * так и из-за специфики обработки ошибок через catchError
 *
 * @see [Поведение нескольких связанных операторов switchMap](https://github.com/ReactiveX/rxjs/issues/5000)
 * @see [Обработка ошибок эффектов NgRx](https://tomastrojcak.medium.com/ngrx-effects-error-handling-fb8b1b7f6450)
 *
 * @remarks Решение восстанавливает исходный поток!
 */
export const catchEffectError =
  <K extends string>({ store, methodName, statusKey }: CatchEffectParams<K>) =>
  <T>(source$: Observable<T>): Observable<T> =>
    source$.pipe(
      catchError(() => {
        updateState(
          store,
          `${methodName}Failure`,
          setError(statusKey) as never
        );

        return EMPTY;
      }),
      repeat()
    );
