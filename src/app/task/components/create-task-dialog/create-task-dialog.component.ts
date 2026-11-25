import { DOCUMENT, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  TuiAutoFocus,
  TuiDay,
  type TuiIdentityMatcher,
  type TuiStringHandler,
} from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiCalendar,
  TuiDataList,
  type TuiDialogContext,
  TuiError,
  TuiFilterByInputPipe,
  TuiInput,
  TuiLoader,
  TuiTextfield,
  type TuiTextfieldMultiComponent,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiComboBox,
  TuiDataListWrapper,
  TuiHideSelectedPipe,
  TuiInputChip,
  TuiInputDate,
  TuiSegmented,
  TuiSelect,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  catchError,
  debounceTime,
  EMPTY,
  filter,
  finalize,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { PermissionStore } from '@core/permissions/+store/permission.store';
import { ProjectPermission } from '@core/permissions/enums/project-permission.enum';
import { ProjectStore } from '@core/project/+store/project.store';
import { UserStore } from '@core/user/+store/user.store';
import { UserRef } from '@core/user/interfaces/user-ref.interface';
import { MarkdownEditorComponent } from '@shared/components/markdown-editor/markdown-editor.component';
import { ErrorResponse } from '@shared/interfaces/error-response.interface';
import { NotificationService } from '@shared/services/notification.service';
import { applyFormServerError } from '@shared/utils/apply-form-server-error.util';
import { parseDuration } from '@shared/utils/duration-parser.util';
import { getDurationValidator } from '@shared/validators/duration.util';
import { getLengthValidator } from '@shared/validators/length.util';
import { getRequiredValidator } from '@shared/validators/required.util';
import { ProjectStatusesStore } from '@status/+store/project-statuses.store';
import { Status } from '@status/interfaces/status.interface';

import { MemberStore } from '../../../dictionary/+store/member.store';
import { SubsystemStore } from '../../../dictionary/+store/subsystem.store';
import { TagStore } from '../../../dictionary/+store/tag.store';
import { Subsystem } from '../../../dictionary/interfaces/subsystem.interface';
import { Tag } from '../../../dictionary/interfaces/tag.interface';
import { ApiTagService } from '../../../dictionary/services/api-tag.service';
import { BUG_DESCRIPTION_TEMPLATE } from '../../config/bug-description-template.config';
import { Priority } from '../../enums/priority.enum';
import { TaskType } from '../../enums/task-type.enum';
import { TaskCreateRequest } from '../../interfaces/api/requests/task-create-request.interface';
import { CreateTaskDialogContextData } from '../../interfaces/create-task-dialog-context.interface';
import { CreateTaskForm } from '../../interfaces/create-task-form.interface';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { TaskParentRef } from '../../interfaces/task-parent-ref.interface';
import { ApiTaskService } from '../../services/api-task.service';
import { TaskMemberSelectComponent } from '../task-member-select/task-member-select.component';
import { TaskPriorityBadgeComponent } from '../task-priority-badge/task-priority-badge.component';
import { TaskStatusBadgeComponent } from '../task-status-badge/task-status-badge.component';

type CreateTaskFormValue = ReturnType<FormGroup<CreateTaskForm>['getRawValue']>;

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_ESTIMATE_MINUTES = 100000;
const SEARCH_DEBOUNCE_MS = 300;
const PARENT_SEARCH_LIMIT = 10;
const UNPROCESSABLE_HTTP_STATUS = 422;
const GENERIC_ERROR_MESSAGE =
  'Не удалось выполнить действие. Повторите попытку';

const TASK_TYPES = Object.values(TaskType);
const PRIORITIES = Object.values(Priority);

const MEMBER_FIELDS: readonly {
  controlName: 'assignee' | 'reviewer';
  label: string;
}[] = [
  { controlName: 'assignee', label: 'Исполнитель' },
  { controlName: 'reviewer', label: 'Ревьюер' },
];

const SERVER_ERROR_FIELD_MAP: Readonly<Record<string, string>> = {
  parentId: 'parent',
  statusId: 'status',
  assigneeId: 'assignee',
  reviewerId: 'reviewer',
  subsystemId: 'subsystem',
  estimateMinutes: 'estimate',
  tagIds: 'tags',
};

@Component({
  selector: 'app-create-task-dialog',
  imports: [
    MarkdownEditorComponent,
    ReactiveFormsModule,
    TaskMemberSelectComponent,
    TaskPriorityBadgeComponent,
    TaskStatusBadgeComponent,
    TitleCasePipe,
    TuiAutoFocus,
    TuiButton,
    TuiCalendar,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiDataListWrapper,
    TuiError,
    TuiFilterByInputPipe,
    TuiHideSelectedPipe,
    TuiInput,
    TuiInputChip,
    TuiInputDate,
    TuiLoader,
    TuiSegmented,
    TuiSelect,
    TuiTextfield,
  ],
  templateUrl: './create-task-dialog.component.html',
  styleUrl: './create-task-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onDocumentEscape($event)' },
})
export class CreateTaskDialogComponent {
  private readonly context =
    injectContext<
      TuiDialogContext<TaskDetail | null, CreateTaskDialogContextData>
    >();
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly apiTaskService = inject(ApiTaskService);
  private readonly apiTagService = inject(ApiTagService);
  private readonly projectStore = inject(ProjectStore);
  private readonly statusesStore = inject(ProjectStatusesStore);
  private readonly memberStore = inject(MemberStore);
  private readonly subsystemStore = inject(SubsystemStore);
  private readonly tagStore = inject(TagStore);
  private readonly userStore = inject(UserStore);
  private readonly permissionStore = inject(PermissionStore);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly parentSearch$$ = new Subject<string>();
  private readonly canCreateTag = computed(() =>
    this.permissionStore.hasPermission(ProjectPermission.TAG_CREATE)
  );
  private initialValue: CreateTaskFormValue;

  protected readonly taskTypes = TASK_TYPES;
  protected readonly priorities = PRIORITIES;
  protected readonly memberFields = MEMBER_FIELDS;

  protected readonly isLoading = this.context.data.isLoading;
  protected readonly isCreatingTag = signal(false);

  protected readonly members = this.memberStore.entities;
  protected readonly subsystems = this.subsystemStore.entities;
  protected readonly tags = this.tagStore.entities;
  protected readonly availableStatuses = computed(() =>
    this.statusesStore.statuses().filter((status) => !status.requiresReason)
  );

  protected readonly form = inject(FormBuilder).group<CreateTaskForm>({
    type: new FormControl<TaskType>(this.context.data.type ?? TaskType.TASK, {
      nonNullable: true,
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [
        getRequiredValidator('Введите название'),
        getLengthValidator({ max: MAX_TITLE_LENGTH, trim: true }),
      ],
    }),
    description: new FormControl(
      this.context.data.type === TaskType.BUG ? BUG_DESCRIPTION_TEMPLATE : '',
      {
        nonNullable: true,
        validators: [
          getLengthValidator({ max: MAX_DESCRIPTION_LENGTH, trim: true }),
        ],
      }
    ),
    parent: new FormControl<TaskParentRef | null>(
      this.context.data.parent ?? null,
      this.context.data.type === TaskType.SUBTASK
        ? [getRequiredValidator('Выберите родительскую задачу')]
        : []
    ),
    status: new FormControl<Status | null>(this.resolveDefaultStatus()),
    priority: new FormControl<Priority>(Priority.MEDIUM, {
      nonNullable: true,
    }),
    assignee: new FormControl<UserRef | null>(null),
    reviewer: new FormControl<UserRef | null>(null),
    subsystem: new FormControl<Subsystem | null>(null),
    dueDate: new FormControl<TuiDay | null>(null),
    estimate: new FormControl('', {
      nonNullable: true,
      validators: [getDurationValidator({ min: 1, max: MAX_ESTIMATE_MINUTES })],
    }),
    tags: new FormControl<Tag[]>([], { nonNullable: true }),
  });

  protected readonly formValue = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  protected readonly parentOptions = toSignal(
    this.parentSearch$$.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      switchMap((q) => {
        const projectId = this.projectStore.currentProjectId();

        if (!projectId) {
          return of<readonly TaskParentRef[]>([]);
        }

        return this.apiTaskService
          .searchTasks(projectId, {
            q,
            types: [TaskType.TASK, TaskType.BUG],
            limit: PARENT_SEARCH_LIMIT,
          })
          .pipe(
            map((items): readonly TaskParentRef[] =>
              items.map(({ id, key, title }) => ({ id, key, title }))
            ),
            startWith(null),
            catchError(() => of<readonly TaskParentRef[]>([]))
          );
      })
    ),
    {
      initialValue: this.context.data.parent ? [this.context.data.parent] : [],
    }
  );

  protected readonly hasSubsystems = computed(
    () => this.subsystems().length > 0
  );
  protected readonly isSubtask = computed(
    () => this.formValue().type === TaskType.SUBTASK
  );
  protected readonly activeTypeIndex = computed(() =>
    Math.max(0, TASK_TYPES.indexOf(this.formValue().type))
  );
  protected readonly currentUserRef = computed<UserRef | null>(() => {
    const user = this.userStore.currentUser();

    return user
      ? { userId: user.id, name: user.name, username: user.username }
      : null;
  });

  constructor() {
    this.initialValue = this.form.getRawValue();

    toObservable(this.availableStatuses)
      .pipe(
        filter((statuses) => statuses.length > 0),
        take(1),
        tap(() => {
          const defaultStatus = this.resolveDefaultStatus();

          if (!defaultStatus || this.initialValue.status !== null) {
            return;
          }

          this.initialValue = { ...this.initialValue, status: defaultStatus };

          if (this.form.controls.status.value === null) {
            this.form.controls.status.setValue(defaultStatus);
          } else {
            this.context.data.isDirty.set(this.isFormDirty());
          }
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    this.form.valueChanges
      .pipe(
        tap(() => {
          this.context.data.isDirty.set(this.isFormDirty());
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  protected readonly matchById: TuiIdentityMatcher<{ id: string }> = (
    first,
    second
  ) => first.id === second.id;

  protected readonly stringifyName: TuiStringHandler<{
    id: string;
    name?: string;
  }> = (item) => item.name ?? '';

  protected readonly stringifyParent: TuiStringHandler<TaskParentRef> = (
    parent
  ) => `${parent.key} ${parent.title}`;

  protected readonly stringifyTitleCase: TuiStringHandler<Priority> = (value) =>
    value.charAt(0).toUpperCase() + value.slice(1);

  protected onDocumentEscape(event: Event): void {
    // dismissible: false блокирует и клик вне окна, и Esc — обрабатываем Esc сами
    if (
      event.defaultPrevented ||
      this.isLoading() ||
      this.document.querySelector('tui-dropdown, tui-dialog ~ tui-dialog')
    ) {
      return;
    }

    event.preventDefault();
    this.onCancelClick();
  }

  protected onTypeIndexChange(index: number): void {
    if (this.isLoading()) {
      return;
    }

    const nextType = TASK_TYPES[index] ?? TaskType.TASK;

    if (this.form.controls.type.value === nextType) {
      return;
    }

    this.form.controls.type.setValue(nextType);

    if (
      nextType === TaskType.BUG &&
      !this.form.controls.description.value.trim()
    ) {
      this.form.controls.description.setValue(BUG_DESCRIPTION_TEMPLATE);
    }

    if (nextType === TaskType.SUBTASK) {
      this.form.controls.parent.setValidators(
        getRequiredValidator('Выберите родительскую задачу')
      );
      this.parentSearch$$.next('');
    } else {
      this.form.controls.parent.clearValidators();
      this.form.controls.parent.setValue(null);
    }

    this.form.controls.parent.updateValueAndValidity();
  }

  protected onParentFocus(): void {
    const options = this.parentOptions();

    if (
      options !== null &&
      (options.length === 0 ||
        (options.length === 1 &&
          options[0].id === this.form.controls.parent.value?.id))
    ) {
      this.parentSearch$$.next('');
    }
  }

  protected onParentInput(query: string): void {
    const current = this.form.controls.parent.value;

    if (current && query !== this.stringifyParent(current)) {
      this.form.controls.parent.setValue(null);
    }

    this.parentSearch$$.next(query);
  }

  protected onMemberChange(
    controlName: 'assignee' | 'reviewer',
    user: UserRef | null
  ): void {
    this.form.controls[controlName].setValue(user);
  }

  protected onTagsInput(): void {
    if (this.form.controls.tags.errors) {
      this.form.controls.tags.setErrors(null);
    }
  }

  protected getCreatableTagName(rawName: string): string | null {
    if (!this.canCreateTag()) {
      return null;
    }

    const name = rawName.trim();

    if (!name) {
      return null;
    }

    const hasTag = this.tags().some(
      (tag) => tag.name.toLowerCase() === name.toLowerCase()
    );

    return hasTag ? null : name;
  }

  protected onCreateTag(
    rawName: string,
    tagsField: TuiTextfieldMultiComponent<Tag>
  ): void {
    const name = rawName.trim();

    if (!name || this.isCreatingTag() || this.isLoading()) {
      return;
    }

    const existingTag = this.tags().find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase()
    );

    if (existingTag) {
      const isSelected = this.form.controls.tags.value.some(
        (tag) => tag.id === existingTag.id
      );

      if (isSelected) {
        this.clearTagInput(tagsField);
      } else {
        tagsField.handleOption(existingTag);
      }

      return;
    }

    const projectId = this.projectStore.currentProjectId();

    if (!projectId || !this.canCreateTag()) {
      return;
    }

    this.isCreatingTag.set(true);

    this.apiTagService
      .createTag(projectId, { name })
      .pipe(
        tap({
          next: (createdTag) => {
            this.tagStore.addTag(createdTag);
            tagsField.handleOption(createdTag);
            this.form.controls.tags.setErrors(null);
          },
          error: (error: unknown) => {
            if (
              applyFormServerError(this.form, error, {
                fieldMap: { name: 'tags' },
              })
            ) {
              return;
            }

            this.showFallbackError(error);
          },
        }),
        catchError(() => EMPTY),
        finalize(() => {
          this.isCreatingTag.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  protected onCancelClick(): void {
    if (this.isLoading()) {
      return;
    }

    this.context.data.canClose$
      .pipe(
        take(1),
        filter(Boolean),
        tap(() => {
          this.context.completeWith(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();

      return;
    }

    const projectId = this.projectStore.currentProjectId();

    if (!projectId || this.isLoading()) {
      return;
    }

    const payload = this.buildCreatePayload();

    this.isLoading.set(true);
    this.form.disable({ emitEvent: false });

    this.apiTaskService
      .createTask(projectId, payload)
      .pipe(
        tap({
          next: (createdTask) => {
            this.context.data.isDirty.set(false);
            this.notificationService.showSuccess(
              `Задача ${createdTask.key} создана`
            );
            this.context.completeWith(createdTask);
          },
          error: (error: unknown) => {
            this.isLoading.set(false);
            this.form.enable({ emitEvent: false });

            const isApplied = applyFormServerError(this.form, error, {
              fieldMap: SERVER_ERROR_FIELD_MAP,
            });

            if (isApplied) {
              afterNextRender(
                () => {
                  this.focusFirstInvalidField();
                },
                { injector: this.injector }
              );

              return;
            }

            if (
              error instanceof HttpErrorResponse &&
              error.status === UNPROCESSABLE_HTTP_STATUS
            ) {
              this.showFallbackError(error);
            }
          },
        }),
        catchError(() => EMPTY),
        finalize(() => {
          this.isLoading.set(false);

          if (this.form.disabled) {
            this.form.enable({ emitEvent: false });
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private isFormDirty(): boolean {
    const current = this.form.getRawValue();
    const initial = this.initialValue;

    return (
      current.type !== initial.type ||
      current.title !== initial.title ||
      current.description !== initial.description ||
      current.parent?.id !== initial.parent?.id ||
      current.status?.id !== initial.status?.id ||
      current.priority !== initial.priority ||
      current.assignee?.userId !== initial.assignee?.userId ||
      current.reviewer?.userId !== initial.reviewer?.userId ||
      current.subsystem?.id !== initial.subsystem?.id ||
      current.dueDate?.toJSON() !== initial.dueDate?.toJSON() ||
      current.estimate !== initial.estimate ||
      !this.hasSameTags(current.tags, initial.tags)
    );
  }

  private hasSameTags(first: readonly Tag[], second: readonly Tag[]): boolean {
    return (
      first.length === second.length &&
      first.every((tag, index) => tag.id === second[index]?.id)
    );
  }

  private resolveDefaultStatus(): Status | null {
    const statuses = this.availableStatuses();

    if (statuses.length === 0) {
      return null;
    }

    return (
      statuses.find((status) => status.id === this.context.data.statusId) ??
      statuses[0]
    );
  }

  private buildCreatePayload(): TaskCreateRequest {
    const formValue = this.form.getRawValue();
    const description = formValue.description.trim();
    const estimate = formValue.estimate.trim();

    return {
      type: formValue.type,
      title: formValue.title.trim(),
      description: description !== '' ? description : null,
      statusId: formValue.status?.id ?? null,
      priority: formValue.priority,
      assigneeId: formValue.assignee?.userId ?? null,
      reviewerId: formValue.reviewer?.userId ?? null,
      subsystemId: formValue.subsystem?.id ?? null,
      dueDate: formValue.dueDate ? formValue.dueDate.toJSON() : null,
      estimateMinutes: estimate !== '' ? parseDuration(estimate) : null,
      tagIds: formValue.tags.map((tag) => tag.id),
      parentId: formValue.parent?.id ?? null,
    };
  }

  private focusFirstInvalidField(): void {
    const invalidControl =
      this.elementRef.nativeElement.querySelector<HTMLElement>(
        'input.ng-invalid, app-markdown-editor.ng-invalid, app-task-member-select.ng-invalid input'
      );

    if (!invalidControl) {
      return;
    }

    const focusTarget =
      invalidControl.tagName === 'INPUT'
        ? invalidControl
        : (invalidControl.querySelector<HTMLElement>(
            ':not([hidden]) > tui-editor [contenteditable="true"]'
          ) ?? invalidControl.querySelector<HTMLElement>('button'));

    focusTarget?.focus();
  }

  private clearTagInput(tagsField: TuiTextfieldMultiComponent<Tag>): void {
    const input = tagsField.input()?.nativeElement;

    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  private showFallbackError(error: unknown): void {
    const body =
      error instanceof HttpErrorResponse
        ? (error.error as Partial<ErrorResponse> | null)
        : null;

    this.notificationService.showError(
      body?.error?.message ?? GENERIC_ERROR_MESSAGE
    );
  }
}
