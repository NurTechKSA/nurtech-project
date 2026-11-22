import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  type Signal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { TuiDay, type TuiStringHandler } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiCalendar,
  TuiDataList,
  type TuiDialogContext,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiEditor } from '@taiga-ui/editor';
import {
  TuiChevron,
  TuiChip,
  TuiInputDate,
  TuiSegmented,
  TuiSelect,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  catchError,
  debounceTime,
  filter,
  finalize,
  map,
  of,
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
import { MarkdownEditorDirective } from '@shared/directives/markdown-editor.directive';
import { ErrorResponse } from '@shared/interfaces/error-response.interface';
import { NotificationService } from '@shared/services/notification.service';
import { applyFormServerError } from '@shared/utils/apply-form-server-error.util';
import { parseDuration } from '@shared/utils/duration-parser.util';
import { getDurationValidator } from '@shared/validators/duration.util';
import { getLengthValidator } from '@shared/validators/length.util';
import { ProjectStatusesStore } from '@status/+store/project-statuses.store';

import { MemberStore } from '../../../dictionary/+store/member.store';
import { SubsystemStore } from '../../../dictionary/+store/subsystem.store';
import { TagStore } from '../../../dictionary/+store/tag.store';
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

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_ESTIMATE_MINUTES = 100000;
const SEARCH_DEBOUNCE_MS = 300;
const PARENT_SEARCH_LIMIT = 10;
const UNPROCESSABLE_HTTP_STATUS = 422;

const TASK_TYPES: readonly { value: TaskType; label: string }[] = [
  { value: TaskType.TASK, label: 'Задача' },
  { value: TaskType.BUG, label: 'Баг' },
  { value: TaskType.SUBTASK, label: 'Подзадача' },
];

const PRIORITY_OPTIONS: readonly { value: Priority; label: string }[] = [
  { value: Priority.LOW, label: 'Низкий' },
  { value: Priority.MEDIUM, label: 'Средний' },
  { value: Priority.HIGH, label: 'Высокий' },
  { value: Priority.CRITICAL, label: 'Критический' },
];

const PRIORITY_LABELS: Readonly<Record<Priority, string>> = {
  [Priority.LOW]: 'Низкий',
  [Priority.MEDIUM]: 'Средний',
  [Priority.HIGH]: 'Высокий',
  [Priority.CRITICAL]: 'Критический',
};

const MEMBER_FIELDS: readonly {
  controlName: 'assigneeId' | 'reviewerId';
  label: string;
}[] = [
  { controlName: 'assigneeId', label: 'Исполнитель' },
  { controlName: 'reviewerId', label: 'Ревьюер' },
];

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

@Component({
  selector: 'app-create-task-dialog',
  imports: [
    MarkdownEditorDirective,
    ReactiveFormsModule,
    TaskMemberSelectComponent,
    TuiButton,
    TuiCalendar,
    TuiChevron,
    TuiChip,
    TuiDataList,
    TuiEditor,
    TuiError,
    TuiIcon,
    TuiInput,
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

  private readonly titleInput =
    viewChild<ElementRef<HTMLInputElement>>('titleInput');
  private readonly parentInput =
    viewChild<ElementRef<HTMLInputElement>>('parentInput');

  private readonly parentSearch$$ = new Subject<string>();
  private readonly selectedType: Signal<TaskType>;
  private readonly selectedTagIds: Signal<Tag['id'][]>;
  private readonly selectedAssigneeId: Signal<string | null>;
  private readonly selectedReviewerId: Signal<string | null>;
  private readonly tagQuery: Signal<string>;
  private initialFormValue: ReturnType<
    FormGroup<CreateTaskForm>['getRawValue']
  >;

  private readonly statusNameMap = computed(
    () =>
      new Map(
        this.statusesStore.statuses().map((status) => [status.id, status.name])
      )
  );
  private readonly subsystemNameMap = computed(
    () =>
      new Map(this.subsystemStore.entities().map((sub) => [sub.id, sub.name]))
  );

  protected readonly taskTypes = TASK_TYPES;
  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly memberFields = MEMBER_FIELDS;

  protected readonly isLoading = signal(false);
  protected readonly isSearchingParents = signal(false);
  protected readonly isCreatingTag = signal(false);
  protected readonly isParentDropdownOpen = signal(false);
  protected readonly isTagDropdownOpen = signal(false);
  protected readonly parentOptions = signal<TaskParentRef[]>(
    this.context.data.parent ? [this.context.data.parent] : []
  );
  protected readonly parentQuery = signal(
    this.formatParent(this.context.data.parent ?? null)
  );
  protected readonly tagInputControl = new FormControl('', {
    nonNullable: true,
  });

  protected readonly form = inject(FormBuilder).group<CreateTaskForm>({
    type: new FormControl<TaskType>(this.context.data.type ?? TaskType.TASK, {
      nonNullable: true,
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [
        createRequiredValidator('Введите название'),
        getLengthValidator({ max: MAX_TITLE_LENGTH }),
      ],
    }),
    description: new FormControl(
      this.context.data.type === TaskType.BUG ? BUG_DESCRIPTION_TEMPLATE : '',
      {
        nonNullable: true,
        validators: [getLengthValidator({ max: MAX_DESCRIPTION_LENGTH })],
      }
    ),
    parent: new FormControl<TaskParentRef | null>(
      this.context.data.parent ?? null,
      this.context.data.type === TaskType.SUBTASK
        ? [createRequiredValidator('Выберите родительскую задачу')]
        : []
    ),
    statusId: new FormControl<string | null>(
      this.context.data.statusId ?? null
    ),
    priority: new FormControl<Priority>(Priority.MEDIUM, {
      nonNullable: true,
    }),
    assigneeId: new FormControl<string | null>(null),
    reviewerId: new FormControl<string | null>(null),
    subsystemId: new FormControl<string | null>(null),
    dueDate: new FormControl<TuiDay | null>(null),
    estimate: new FormControl('', {
      nonNullable: true,
      validators: [getDurationValidator({ min: 1, max: MAX_ESTIMATE_MINUTES })],
    }),
    tagIds: new FormControl<Tag['id'][]>([], { nonNullable: true }),
  });

  protected readonly availableStatuses = computed(() =>
    this.statusesStore.statuses().filter((status) => !status.requiresReason)
  );
  protected readonly members = this.memberStore.entities;
  protected readonly subsystems = this.subsystemStore.entities;
  protected readonly hasSubsystems = computed(
    () => this.subsystems().length > 0
  );
  protected readonly isSubtask = computed(
    () => this.selectedType() === TaskType.SUBTASK
  );
  protected readonly activeTypeIndex = computed(() =>
    Math.max(
      0,
      TASK_TYPES.findIndex((option) => option.value === this.selectedType())
    )
  );
  protected readonly currentUserRef = computed<UserRef | null>(() => {
    const user = this.userStore.currentUser();

    return user
      ? { userId: user.id, name: user.name, username: user.username }
      : null;
  });
  protected readonly canCreateTag = computed(() =>
    this.permissionStore.hasPermission(ProjectPermission.TAG_CREATE)
  );
  protected readonly trimmedTagQuery = computed(() => this.tagQuery().trim());
  protected readonly selectedTags = computed(() => {
    const ids = new Set(this.selectedTagIds());

    return this.tagStore.entities().filter((tag) => ids.has(tag.id));
  });
  protected readonly unselectedTags = computed(() => {
    const ids = new Set(this.selectedTagIds());
    const query = this.trimmedTagQuery().toLowerCase();

    return this.tagStore
      .entities()
      .filter(
        (tag) => !ids.has(tag.id) && tag.name.toLowerCase().includes(query)
      );
  });

  constructor() {
    this.selectedType = toSignal(this.form.controls.type.valueChanges, {
      initialValue: this.form.controls.type.value,
    });
    this.selectedTagIds = toSignal(this.form.controls.tagIds.valueChanges, {
      initialValue: this.form.controls.tagIds.value,
    });
    this.selectedAssigneeId = toSignal(
      this.form.controls.assigneeId.valueChanges,
      { initialValue: this.form.controls.assigneeId.value }
    );
    this.selectedReviewerId = toSignal(
      this.form.controls.reviewerId.valueChanges,
      { initialValue: this.form.controls.reviewerId.value }
    );
    this.tagQuery = toSignal(this.tagInputControl.valueChanges, {
      initialValue: '',
    });
    this.initialFormValue = this.form.getRawValue();

    effect(() => {
      const statuses = this.availableStatuses();

      if (!this.form.controls.statusId.value && statuses.length > 0) {
        const defaultStatusId = statuses[0].id;

        this.form.controls.statusId.setValue(defaultStatusId, {
          emitEvent: false,
        });
        this.initialFormValue = {
          ...this.initialFormValue,
          statusId: defaultStatusId,
        };
      }
    });

    this.form.valueChanges
      .pipe(
        tap(() => {
          const isModified =
            JSON.stringify(this.form.getRawValue()) !==
            JSON.stringify(this.initialFormValue);

          this.context.data.isDirty.set(isModified);
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    this.parentSearch$$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        tap(() => {
          this.isSearchingParents.set(true);
        }),
        switchMap((query) => {
          const projectId = this.projectStore.currentProjectId();

          if (!projectId) {
            return of<TaskParentRef[]>([]);
          }

          return this.apiTaskService
            .searchTasks(projectId, {
              q: query,
              types: [TaskType.TASK, TaskType.BUG],
              limit: PARENT_SEARCH_LIMIT,
            })
            .pipe(
              map((items) =>
                items.map(({ id, key, title }) => ({ id, key, title }))
              ),
              catchError(() => of<TaskParentRef[]>([]))
            );
        }),
        tap((options) => {
          this.parentOptions.set(options);
          this.isSearchingParents.set(false);
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  protected readonly stringifyStatus: TuiStringHandler<string | null> = (id) =>
    id ? (this.statusNameMap().get(id) ?? '') : '';

  protected readonly stringifyPriority: TuiStringHandler<Priority> = (
    priority
  ) => PRIORITY_LABELS[priority];

  protected readonly stringifySubsystem: TuiStringHandler<string | null> = (
    id
  ) => (id ? (this.subsystemNameMap().get(id) ?? '') : '');

  protected selectedMember(field: 'assigneeId' | 'reviewerId'): UserRef | null {
    const userId =
      field === 'assigneeId'
        ? this.selectedAssigneeId()
        : this.selectedReviewerId();

    if (!userId) {
      return null;
    }

    const currentUser = this.currentUserRef();

    if (currentUser?.userId === userId) {
      return currentUser;
    }

    return this.members().find((member) => member.userId === userId) ?? null;
  }

  protected onMemberChange(
    field: 'assigneeId' | 'reviewerId',
    user: UserRef | null
  ): void {
    this.form.controls[field].setValue(user?.userId ?? null);
  }

  protected onDocumentEscape(event: Event): void {
    if (
      event.defaultPrevented ||
      this.isParentDropdownOpen() ||
      this.isTagDropdownOpen() ||
      this.document.querySelector('tui-dropdown, tui-dialog ~ tui-dialog')
    ) {
      return;
    }

    event.preventDefault();
    this.onCancelClick();
  }

  protected onTypeIndexChange(index: number): void {
    const nextType = TASK_TYPES.at(index)?.value ?? TaskType.TASK;

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
        createRequiredValidator('Выберите родительскую задачу')
      );
      this.searchParents('');
    } else {
      this.form.controls.parent.clearValidators();
      this.form.controls.parent.setValue(null);
      this.parentQuery.set('');
    }

    this.form.controls.parent.updateValueAndValidity();
  }

  protected onParentFocus(): void {
    this.isParentDropdownOpen.set(true);

    if (this.parentOptions().length === 0) {
      this.searchParents('');
    }
  }

  protected onParentSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;

    this.parentQuery.set(query);

    if (
      this.form.controls.parent.value &&
      query !== this.formatParent(this.form.controls.parent.value)
    ) {
      this.form.controls.parent.setValue(null);
    }

    this.isParentDropdownOpen.set(true);
    this.searchParents(query);
  }

  protected onParentSelect(parent: TaskParentRef): void {
    this.form.controls.parent.setValue(parent);
    this.parentQuery.set(this.formatParent(parent));
    this.isParentDropdownOpen.set(false);
  }

  protected onSelectTag(tag: Tag): void {
    this.addTagId(tag.id);
    this.tagInputControl.setValue('');
    this.tagInputControl.setErrors(null);
    this.isTagDropdownOpen.set(false);
  }

  protected onRemoveTag(tagId: Tag['id']): void {
    const current = this.form.controls.tagIds.value;

    this.form.controls.tagIds.setValue(current.filter((id) => id !== tagId));
  }

  protected onTagEnter(event: Event): void {
    event.preventDefault();
    const rawName = this.tagInputControl.value.trim();

    if (!rawName || this.isCreatingTag()) {
      return;
    }

    const existingTag = this.tagStore
      .entities()
      .find((tag) => tag.name.toLowerCase() === rawName.toLowerCase());

    if (existingTag) {
      this.addTagId(existingTag.id);
      this.tagInputControl.setValue('');
      this.tagInputControl.setErrors(null);
      this.isTagDropdownOpen.set(false);

      return;
    }

    const projectId = this.projectStore.currentProjectId();

    if (!projectId || !this.canCreateTag()) {
      return;
    }

    this.isCreatingTag.set(true);

    this.apiTagService
      .createTag(projectId, { name: rawName })
      .pipe(
        finalize(() => {
          this.isCreatingTag.set(false);
        }),
        tap({
          next: (createdTag) => {
            this.tagStore.addTag(createdTag);
            this.addTagId(createdTag.id);
            this.tagInputControl.setValue('');
            this.tagInputControl.setErrors(null);
            this.isTagDropdownOpen.set(false);
          },
          error: (error: unknown) => {
            applyFormServerError(
              new FormGroup({ name: this.tagInputControl }),
              error
            );
          },
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  protected onCancelClick(): void {
    this.context.data.canClose$
      .pipe(
        take(1),
        filter(Boolean),
        tap(() => {
          this.context.completeWith(null);
        })
      )
      .subscribe();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (this.form.controls.title.invalid) {
        this.titleInput()?.nativeElement.focus();
      } else if (this.form.controls.parent.invalid) {
        this.parentInput()?.nativeElement.focus();
      }

      return;
    }

    const projectId = this.projectStore.currentProjectId();

    if (!projectId || this.isLoading()) {
      return;
    }

    const formValue = this.form.getRawValue();
    const description = formValue.description.trim();
    const estimate = formValue.estimate.trim();
    const payload: TaskCreateRequest = {
      type: formValue.type,
      title: formValue.title.trim(),
      description: description !== '' ? description : null,
      statusId: formValue.statusId,
      priority: formValue.priority,
      assigneeId: formValue.assigneeId,
      reviewerId: formValue.reviewerId,
      subsystemId: formValue.subsystemId,
      dueDate: formValue.dueDate ? formValue.dueDate.toJSON() : null,
      estimateMinutes: estimate !== '' ? parseDuration(estimate) : null,
      tagIds: formValue.tagIds,
      parentId: formValue.parent?.id ?? null,
    };

    this.isLoading.set(true);
    this.form.disable({ emitEvent: false });

    this.apiTaskService
      .createTask(projectId, payload)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.form.enable({ emitEvent: false });
        }),
        tap({
          next: (createdTask) => {
            this.context.data.isDirty.set(false);
            this.notificationService.showSuccess(
              `Задача ${createdTask.key} создана`
            );
            this.context.completeWith(createdTask);
          },
          error: (error: unknown) => {
            const isApplied = applyFormServerError(this.form, error);

            if (
              !isApplied &&
              error instanceof HttpErrorResponse &&
              error.status === UNPROCESSABLE_HTTP_STATUS
            ) {
              const body = error.error as Partial<ErrorResponse>;
              const message = body.error?.message;

              if (message) {
                this.notificationService.showError(message);
              }
            }
          },
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private addTagId(tagId: Tag['id']): void {
    const current = this.form.controls.tagIds.value;

    if (!current.includes(tagId)) {
      this.form.controls.tagIds.setValue([...current, tagId]);
    }
  }

  private searchParents(query: string): void {
    this.parentSearch$$.next(query);
  }

  private formatParent(parent: TaskParentRef | null): string {
    return parent ? `${parent.key} ${parent.title}` : '';
  }
}
