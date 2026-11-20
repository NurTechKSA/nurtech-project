import { TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  TuiButton,
  TuiCalendar,
  TuiDataList,
  TuiDropdown,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLink,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiButtonLoading,
  TuiChevron,
  TuiChip,
  TuiInputDate,
} from '@taiga-ui/kit';
import { catchError, EMPTY, finalize, startWith, switchMap, tap } from 'rxjs';

import { PermissionStore } from '@core/permissions/+store/permission.store';
import { ProjectPermission } from '@core/permissions/enums/project-permission.enum';
import { ProjectStore } from '@core/project/+store/project.store';
import { UserStore } from '@core/user/+store/user.store';
import { UserAvatarComponent } from '@shared/components/user-avatar/user-avatar.component';
import { NotificationService } from '@shared/services/notification.service';
import { applyFormServerError } from '@shared/utils/apply-form-server-error.util';
import { ProjectStatusesStore } from '@status/+store/project-statuses.store';
import { Status } from '@status/interfaces/status.interface';

import { MemberStore } from '../../../../../dictionary/+store/member.store';
import { SubsystemStore } from '../../../../../dictionary/+store/subsystem.store';
import { TagStore } from '../../../../../dictionary/+store/tag.store';
import { Member } from '../../../../../dictionary/interfaces/member.interface';
import { Subsystem } from '../../../../../dictionary/interfaces/subsystem.interface';
import { Tag } from '../../../../../dictionary/interfaces/tag.interface';
import { ApiTagService } from '../../../../../dictionary/services/api-tag.service';
import { Priority } from '../../../../enums/priority.enum';
import { CreateTaskForm } from '../../../../interfaces/create-task-form.interface';
import { TaskParentRef } from '../../../../interfaces/task-parent-ref.interface';
import { TaskSearchItem } from '../../../../interfaces/task-search-item.interface';
import { TaskPriorityBadgeComponent } from '../../../task-priority-badge/task-priority-badge.component';
import { TaskStatusBadgeComponent } from '../../../task-status-badge/task-status-badge.component';
import { TaskTypeIconComponent } from '../../../task-type-icon/task-type-icon.component';

type MemberControlKey = 'assigneeId' | 'reviewerId';

const PRIORITIES: readonly Priority[] = Object.values(Priority);
const CONFLICT_HTTP_STATUS = 409;
const UNPROCESSABLE_HTTP_STATUS = 422;

@Component({
  selector: 'app-create-task-meta-fields',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TaskPriorityBadgeComponent,
    TaskStatusBadgeComponent,
    TaskTypeIconComponent,
    TitleCasePipe,
    TuiButton,
    TuiButtonLoading,
    TuiCalendar,
    TuiChevron,
    TuiChip,
    TuiDataList,
    TuiDropdown,
    TuiError,
    TuiIcon,
    TuiInput,
    TuiInputDate,
    TuiLink,
    TuiLoader,
    TuiTextfield,
    UserAvatarComponent,
  ],
  templateUrl: './create-task-meta-fields.component.html',
  styleUrl: './create-task-meta-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskMetaFieldsComponent {
  private readonly statusesStore = inject(ProjectStatusesStore);
  private readonly memberStore = inject(MemberStore);
  private readonly subsystemStore = inject(SubsystemStore);
  private readonly tagStore = inject(TagStore);
  private readonly userStore = inject(UserStore);
  private readonly permissionStore = inject(PermissionStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly apiTagService = inject(ApiTagService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = input.required<FormGroup<CreateTaskForm>>();
  readonly isSubtask = input.required<boolean>();
  readonly parentOptions = input.required<readonly TaskSearchItem[]>();
  readonly isSearchingParents = input(false);
  readonly parentSearch = output<string>();

  protected readonly priorities = PRIORITIES;
  protected readonly subsystems = this.subsystemStore.entities;
  protected readonly tags = this.tagStore.entities;
  protected readonly parentQuery = signal('');
  protected readonly assigneeQuery = signal('');
  protected readonly reviewerQuery = signal('');
  protected readonly isParentOpen = signal(false);
  protected readonly isStatusOpen = signal(false);
  protected readonly isPriorityOpen = signal(false);
  protected readonly isAssigneeOpen = signal(false);
  protected readonly isReviewerOpen = signal(false);
  protected readonly isSubsystemOpen = signal(false);
  protected readonly isTagsOpen = signal(false);
  protected readonly isCreatingTag = signal(false);
  protected readonly newTagControl = new FormControl('', { nonNullable: true });

  protected readonly availableStatuses = computed(() =>
    this.statusesStore.statuses().filter((status) => !status.requiresReason)
  );

  protected readonly currentMember = computed<Member | null>(() => {
    const userId = this.userStore.currentUser()?.id;

    if (!userId) {
      return null;
    }

    return (
      this.memberStore.entities().find((member) => member.userId === userId) ??
      null
    );
  });

  protected readonly canCreateTag = computed(() =>
    this.permissionStore.hasPermission(ProjectPermission.TAG_CREATE)
  );

  protected readonly filteredAssigneeMembers = computed(() =>
    this.filterMembers(this.assigneeQuery())
  );

  protected readonly filteredReviewerMembers = computed(() =>
    this.filterMembers(this.reviewerQuery())
  );

  protected readonly formValue = toSignal(
    toObservable(this.form).pipe(
      switchMap((form) => form.valueChanges.pipe(startWith(form.getRawValue())))
    )
  );

  protected readonly selectedParent = computed<TaskParentRef | null>(
    () => this.formValue()?.parent ?? null
  );

  protected readonly selectedStatus = computed<Status | null>(() => {
    const statusId = this.formValue()?.statusId;

    return (
      this.availableStatuses().find((status) => status.id === statusId) ?? null
    );
  });

  protected readonly selectedPriority = computed<Priority>(
    () => this.formValue()?.priority ?? Priority.MEDIUM
  );

  protected readonly selectedAssignee = computed<Member | null>(() => {
    const assigneeId = this.formValue()?.assigneeId;

    return (
      this.memberStore
        .entities()
        .find((member) => member.userId === assigneeId) ?? null
    );
  });

  protected readonly selectedReviewer = computed<Member | null>(() => {
    const reviewerId = this.formValue()?.reviewerId;

    return (
      this.memberStore
        .entities()
        .find((member) => member.userId === reviewerId) ?? null
    );
  });

  protected readonly showAssignMeAssignee = computed(() => {
    const me = this.currentMember();

    return me !== null && this.selectedAssignee()?.userId !== me.userId;
  });

  protected readonly showAssignMeReviewer = computed(() => {
    const me = this.currentMember();

    return me !== null && this.selectedReviewer()?.userId !== me.userId;
  });

  protected readonly selectedSubsystem = computed<Subsystem | null>(() => {
    const subsystemId = this.formValue()?.subsystemId;

    return (
      this.subsystems().find((subsystem) => subsystem.id === subsystemId) ??
      null
    );
  });

  protected readonly selectedTagSet = computed(
    () => new Set(this.formValue()?.tagIds ?? [])
  );

  protected readonly selectedTags = computed<Tag[]>(() => {
    const selected = this.selectedTagSet();

    return this.tags().filter((tag) => selected.has(tag.id));
  });

  onParentQueryChange(query: string): void {
    this.parentQuery.set(query);
    this.parentSearch.emit(query);
  }

  onParentSelect(item: TaskSearchItem): void {
    const control = this.form().controls.parent;

    control.setValue({ id: item.id, key: item.key, title: item.title });
    control.markAsTouched();
    this.isParentOpen.set(false);
  }

  onStatusSelect(status: Status): void {
    const control = this.form().controls.statusId;

    control.setValue(status.id);
    control.markAsTouched();
    this.isStatusOpen.set(false);
  }

  onPrioritySelect(priority: Priority): void {
    const control = this.form().controls.priority;

    control.setValue(priority);
    control.markAsTouched();
    this.isPriorityOpen.set(false);
  }

  onMemberSelect(controlKey: MemberControlKey, userId: string | null): void {
    const control = this.form().controls[controlKey];

    control.setValue(userId);
    control.markAsTouched();

    if (controlKey === 'assigneeId') {
      this.isAssigneeOpen.set(false);
    } else {
      this.isReviewerOpen.set(false);
    }
  }

  onAssignMeClick(controlKey: MemberControlKey): void {
    const me = this.currentMember();

    if (!me) {
      return;
    }

    const control = this.form().controls[controlKey];

    control.setValue(me.userId);
    control.markAsTouched();
  }

  onSubsystemSelect(subsystemId: Subsystem['id'] | null): void {
    const control = this.form().controls.subsystemId;

    control.setValue(subsystemId);
    control.markAsTouched();
    this.isSubsystemOpen.set(false);
  }

  onTagToggle(tagId: Tag['id']): void {
    const control = this.form().controls.tagIds;
    const current = control.value;
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];

    control.setValue(next);
    control.markAsTouched();
  }

  onTagRemove(tagId: Tag['id']): void {
    const control = this.form().controls.tagIds;

    control.setValue(control.value.filter((id) => id !== tagId));
    control.markAsTouched();
  }

  onCreateTagSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const name = this.newTagControl.value.trim();
    const projectId = this.projectStore.currentProjectId();

    if (!name || !projectId || this.isCreatingTag()) {
      return;
    }

    this.isCreatingTag.set(true);
    this.newTagControl.setErrors(null);

    this.apiTagService
      .createTag(projectId, { name })
      .pipe(
        tap((createdTag) => {
          this.tagStore.addTag(createdTag);
          const control = this.form().controls.tagIds;

          control.setValue([...control.value, createdTag.id]);
          control.markAsTouched();
          this.newTagControl.setValue('');
        }),
        catchError((error: unknown) => {
          this.handleCreateTagError(error);

          return EMPTY;
        }),
        finalize(() => {
          this.isCreatingTag.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private filterMembers(query: string): readonly Member[] {
    const normalized = query.trim().toLowerCase();
    const meId = this.currentMember()?.userId;
    const others = this.memberStore
      .entities()
      .filter((member) => member.userId !== meId);

    return normalized
      ? others.filter((member) =>
          member.name.toLowerCase().includes(normalized)
        )
      : others;
  }

  private handleCreateTagError(error: unknown): void {
    const isFieldHttpError =
      error instanceof HttpErrorResponse &&
      (error.status === CONFLICT_HTTP_STATUS ||
        error.status === UNPROCESSABLE_HTTP_STATUS);

    if (isFieldHttpError) {
      applyFormServerError(new FormGroup({ name: this.newTagControl }), error, {
        fallbackField: 'name',
      });

      return;
    }

    this.notificationService.showError(
      'Не удалось создать тег. Повторите попытку'
    );
  }
}
