import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import {
  TuiButton,
  type TuiDialogContext,
  TuiError,
  TuiInput,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiConfirmService } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { filter, isObservable, of, tap } from 'rxjs';

import { MarkdownEditorComponent } from '@shared/components/markdown-editor/markdown-editor.component';
import { ErrorResponse } from '@shared/interfaces/error-response.interface';
import { NotificationService } from '@shared/services/notification.service';
import { applyFormServerError } from '@shared/utils/apply-form-server-error.util';
import { getTrimmedMaxLengthValidator } from '@shared/validators/trimmed-max-length.util';
import { getTrimmedRequiredValidator } from '@shared/validators/trimmed-required.util';

import { CreateTaskDialogStore } from '../../+store/create-task-dialog.store';
import { TaskType } from '../../enums/task-type.enum';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { TaskTypeSelectComponent } from '../task-type-select/task-type-select.component';

const BUG_DESCRIPTION_TEMPLATE = [
  '**Шаги воспроизведения**',
  '',
  '1. ',
  '2. ',
  '',
  '**Ожидаемый результат**',
  '',
  '**Фактический результат**',
].join('\n');

// Ошибки, которые не показывает errorNotificationInterceptor
const DIALOG_ERROR_STATUSES: number[] = [
  HttpStatusCode.NotFound,
  HttpStatusCode.UnprocessableEntity,
];

const GENERIC_ERROR_MESSAGE =
  'Не удалось выполнить действие. Повторите попытку';

@Component({
  selector: 'app-create-task-dialog',
  imports: [
    MarkdownEditorComponent,
    ReactiveFormsModule,
    TaskTypeSelectComponent,
    TuiAutoFocus,
    TuiButton,
    TuiError,
    TuiForm,
    TuiInput,
    TuiLoader,
    TuiTextfield,
  ],
  templateUrl: './create-task-dialog.component.html',
  styleUrl: './create-task-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskDialogComponent {
  private readonly createTaskDialogStore = inject(CreateTaskDialogStore);
  private readonly confirmService = inject(TuiConfirmService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly context = injectContext<TuiDialogContext<TaskDetail>>();
  private readonly titleInput =
    viewChild.required<ElementRef<HTMLInputElement>>('titleInput');
  private readonly markdownEditor = viewChild.required(MarkdownEditorComponent);

  readonly typeOptions = [TaskType.TASK, TaskType.BUG];
  readonly isLoading = this.createTaskDialogStore.isLoading;

  readonly form = inject(FormBuilder).nonNullable.group({
    type: TaskType.TASK,
    title: [
      '',
      [
        getTrimmedRequiredValidator('Введите название'),
        getTrimmedMaxLengthValidator(100),
      ],
    ],
    description: ['', Validators.maxLength(5000)],
  });

  readonly selectedType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  constructor() {
    // Подтверждение закрытия показываем, только если в форме есть изменения
    this.form.valueChanges
      .pipe(
        tap(() => {
          if (this.hasChanges()) {
            this.confirmService.markAsDirty();
          } else {
            this.confirmService.markAsPristine();
          }
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  onTaskTypeChange(type: TaskType): void {
    const { type: typeControl, description } = this.form.controls;

    typeControl.setValue(type);

    if (type === TaskType.BUG && !description.value.trim()) {
      description.setValue(BUG_DESCRIPTION_TEMPLATE);
    }
  }

  // «Отмена» закрывает диалог так же, как ✕ и Esc
  onCancelButtonClick(): void {
    const { closable } = this.context;

    (isObservable(closable) ? closable : of(closable))
      .pipe(
        filter(Boolean),
        tap(() => {
          this.context.$implicit.complete();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onFormSubmit(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidControl();

      return;
    }

    const { type, title, description } = this.form.getRawValue();

    this.createTaskDialogStore.createTask({
      payload: {
        type,
        title: title.trim(),
        description: description.trim() ? description : null,
      },
      onSuccess: (task) => {
        this.context.completeWith(task);
      },
      onError: (error) => {
        this.handleError(error);
      },
    });
  }

  private hasChanges(): boolean {
    const { type, title, description } = this.form.getRawValue();

    return (
      type !== TaskType.TASK ||
      title.trim().length > 0 ||
      description.trim().length > 0
    );
  }

  private handleError(error: unknown): void {
    if (this.destroyRef.destroyed) {
      return;
    }

    if (applyFormServerError(this.form, error)) {
      // Пока шла отправка, tui-loader делал форму inert, фокус — после рендера
      afterNextRender(
        () => {
          this.focusFirstInvalidControl();
        },
        { injector: this.injector }
      );

      return;
    }

    if (
      error instanceof HttpErrorResponse &&
      DIALOG_ERROR_STATUSES.includes(error.status)
    ) {
      const message = (error.error as Partial<ErrorResponse> | null)?.error
        ?.message;

      this.notificationService.showError(
        message?.trim() ? message : GENERIC_ERROR_MESSAGE
      );
    }
  }

  private focusFirstInvalidControl(): void {
    if (this.form.controls.title.invalid) {
      this.titleInput().nativeElement.focus();
    } else if (this.form.controls.description.invalid) {
      this.markdownEditor().focus();
    }
  }
}
