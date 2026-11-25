import { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateTaskDialogData } from './create-task-dialog-data.interface';

export interface CreateTaskDialogContextData extends CreateTaskDialogData {
  isDirty: WritableSignal<boolean>;
  isLoading: WritableSignal<boolean>;
  canClose$: Observable<boolean>;
}
