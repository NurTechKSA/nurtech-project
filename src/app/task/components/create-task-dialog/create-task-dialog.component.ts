import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { TuiButton, type TuiDialogContext, TuiLoader } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { filter, take, tap } from 'rxjs';

import { ProjectStore } from '@core/project/+store/project.store';
import { ErrorResponse } from '@shared/interfaces/error-response.interface';
import { NotificationService } from '@shared/services/notification.service';
import { applyFormServerError } from '@shared/utils/apply-form-server-error.util';
import { parseDuration } from '@shared/utils/duration-parser.util';
import { getDurationValidator } from '@shared/validators/duration.util';
import { getLengthValidator } from '@shared/validators/length.util';
import { ProjectStatusesStore } from '@status/+store/project-statuses.store';
import { Status } from '@status/interfaces/status.interface';

import { CreateTaskDialogStore } from '../../+store/create-task-dialog.store';
import { BUG_DESCRIPTION_TEMPLATE } from '../../config/bug-description-template.config';
import { Priority } from '../../enums/priority.enum';
import { TaskType } from '../../enums/task-type.enum';
import { TaskCreateRequest } from '../../interfaces/api/requests/task-create-request.interface';
import { CreateTaskDialogContextData } from '../../interfaces/create-task-dialog-context.interface';
import { CreateTaskForm } from '../../interfaces/create-task-form.interface';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { CreateTaskMainFieldsComponent } from './components/create-task-main-fields/create-task-main-fields.component';
import { CreateTaskMetaFieldsComponent } from './components/create-task-meta-fields/create-task-meta-fields.component';

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const UNPROCESSABLE_HTTP_STATUS = 422;

function createRequiredValidator(message: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    const isEmpty =
      typeof value === 'string'
        ? value.trim() === ''
        : value === null || value === undefined;

    return isEmpty ? { other: message } : null;
  };
}

function createTrimmedMaxLengthValidator(max: number): ValidatorFn {
  return ({ value }: AbstractControl<string>): ValidationErrors | null =>
    value.trim().length > max
      ? { other: `Не более ${String(max)} символов` }
      : null;
}

@Component({
  imports: [
    CreateTaskMainFieldsComponent,
    CreateTaskMetaFieldsComponent,
    ReactiveFormsModule,
    TuiButton,
    TuiForm,
    TuiLoader,
  ],
  templateUrl: './create-task-dialog.component.html',
  styleUrl: './create-task-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CreateTaskDialogStore],
  host: { '(document:keydown.escape)': 'onDocumentEscape($event)' },
})
export class CreateTaskDialogComponent {
  private readonly context =
    injectContext<
      TuiDialogContext<TaskDetail | null, CreateTaskDialogContextData>
    >();
  private readonly store = inject(CreateTaskDialogStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly statusesStore = inject(ProjectStatusesStore);
  private readonly notificationService = inject(NotificationService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private initialSnapshot = '';

  protected readonly isLoading = this.store.isLoading;
  protected readonly parentOptions = this.store.parentOptions;
  protected readonly isSearchingParents = this.store.isSearchingParents;
  protected readonly isSubtask = signal(
    this.resolveInitialType() === TaskType.SUBTASK
  );
  protected readonly form: FormGroup<CreateTaskForm> = this.buildForm();

  constructor() {
    this.initialSnapshot = JSON.stringify(this.form.getRawValue());
    this.syncDefaultStatusEffect();
    this.handleTypeChanges();
    this.trackDirtyState();

    if (this.isSubtask()) {
      this.onParentSearch('');
    }
  }

  onParentSearch(query: string): void {
    const projectId = this.projectStore.currentProjectId();

    if (!projectId) {
      return;
    }

    this.store.searchParents({ projectId, query });
  }

  onCancelClick(): void {
    if (this.isLoading()) {
      return;
    }

    this.context.data.canClose$
      .pipe(
        filter(Boolean),
        take(1),
        tap(() => {
          this.context.completeWith(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onFormSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();

      return;
    }

    const projectId = this.projectStore.currentProjectId();

    if (!projectId) {
      return;
    }

    this.store.createTask({
      projectId,
      body: this.buildPayload(),
      onSuccess: (task) => {
        this.notificationService.showSuccess(`Задача ${task.key} создана`);
        this.context.completeWith(task);
      },
      onError: (error) => {
        this.handleSubmitError(error);
      },
    });
  }

  protected onDocumentEscape(event: Event): void {
    if (event.defaultPrevented || this.isLoading()) {
      return;
    }

    event.preventDefault();
    this.onCancelClick();
  }

  private resolveInitialType(): TaskType {
    const data = this.context.data;

    return data.type ?? (data.parent ? TaskType.SUBTASK : TaskType.TASK);
  }

  private getFirstAvailableStatusId(): Status['id'] | null {
    return (
      this.statusesStore.statuses().find((status) => !status.requiresReason)
        ?.id ?? null
    );
  }

  private buildForm(): FormGroup<CreateTaskForm> {
    const data = this.context.data;
    const initialType = this.resolveInitialType();
    const initialStatusId = data.statusId ?? this.getFirstAvailableStatusId();
    const fb = inject(FormBuilder);

    return fb.nonNullable.group<CreateTaskForm>({
      type: fb.nonNullable.control(initialType),
      title: fb.nonNullable.control('', [
        createRequiredValidator('Введите название'),
        createTrimmedMaxLengthValidator(MAX_TITLE_LENGTH),
      ]),
      description: fb.nonNullable.control(
        '',
        getLengthValidator({ max: MAX_DESCRIPTION_LENGTH })
      ),
      parent: fb.control(
        data.parent ?? null,
        initialType === TaskType.SUBTASK
          ? [createRequiredValidator('Выберите родительскую задачу')]
          : []
      ),
      statusId: fb.control(initialStatusId),
      priority: fb.nonNullable.control(Priority.MEDIUM),
      assigneeId: fb.control<string | null>(null),
      reviewerId: fb.control<string | null>(null),
      subsystemId: fb.control<string | null>(null),
      dueDate: fb.control(null),
      estimate: fb.nonNullable.control('', getDurationValidator()),
      tagIds: fb.nonNullable.control<string[]>([]),
    });
  }

  private syncDefaultStatusEffect(): void {
    effect(() => {
      const defaultStatusId = this.getFirstAvailableStatusId();
      const statusControl = this.form.controls.statusId;

      if (defaultStatusId && !statusControl.value && !statusControl.dirty) {
        statusControl.setValue(defaultStatusId, { emitEvent: false });
        this.initialSnapshot = JSON.stringify(this.form.getRawValue());
      }
    });
  }

  private handleTypeChanges(): void {
    this.form.controls.type.valueChanges
      .pipe(
        tap((nextType) => {
          this.isSubtask.set(nextType === TaskType.SUBTASK);

          if (
            nextType === TaskType.BUG &&
            !this.form.controls.description.value.trim()
          ) {
            this.form.controls.description.setValue(BUG_DESCRIPTION_TEMPLATE);
          }

          const parentControl = this.form.controls.parent;

          if (nextType === TaskType.SUBTASK) {
            parentControl.setValidators([
              createRequiredValidator('Выберите родительскую задачу'),
            ]);
            parentControl.updateValueAndValidity({ emitEvent: false });

            if (this.parentOptions().length === 0) {
              this.onParentSearch('');
            }

            return;
          }

          parentControl.clearValidators();
          parentControl.setValue(null, { emitEvent: false });
          parentControl.updateValueAndValidity({ emitEvent: false });
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  private trackDirtyState(): void {
    this.form.valueChanges
      .pipe(
        tap(() => {
          const isChanged =
            JSON.stringify(this.form.getRawValue()) !== this.initialSnapshot;

          this.context.data.isDirty.set(isChanged);
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  private buildPayload(): TaskCreateRequest {
    const raw = this.form.getRawValue();
    const estimateText = raw.estimate.trim();

    return {
      type: raw.type,
      title: raw.title.trim(),
      description: raw.description.trim() || null,
      statusId: raw.statusId,
      priority: raw.priority,
      assigneeId: raw.assigneeId,
      reviewerId: raw.reviewerId,
      subsystemId: raw.subsystemId,
      dueDate: raw.dueDate ? raw.dueDate.toJSON() : null,
      estimateMinutes: estimateText ? parseDuration(estimateText) : null,
      tagIds: raw.tagIds,
      parentId: raw.type === TaskType.SUBTASK ? (raw.parent?.id ?? null) : null,
    };
  }

  private handleSubmitError(error: unknown): void {
    const isApplied = applyFormServerError(this.form, error, {
      fieldMap: { parentId: 'parent', estimateMinutes: 'estimate' },
    });

    if (isApplied) {
      this.focusFirstInvalidField();

      return;
    }

    if (
      error instanceof HttpErrorResponse &&
      error.status === UNPROCESSABLE_HTTP_STATUS
    ) {
      const response = error.error as Partial<ErrorResponse> | null;

      if (response?.error?.message) {
        this.notificationService.showError(response.error.message);
      }
    }
  }

  private focusFirstInvalidField(): void {
    const host = this.elementRef.nativeElement;

    if (this.form.controls.title.invalid) {
      host.querySelector<HTMLElement>('#create-task-title')?.focus();

      return;
    }

    if (this.form.controls.parent.invalid) {
      host.querySelector<HTMLElement>('#create-task-parent')?.focus();

      return;
    }

    host
      .querySelector<HTMLElement>(
        'input.ng-invalid, [formControlName].ng-invalid'
      )
      ?.focus();
  }
}
