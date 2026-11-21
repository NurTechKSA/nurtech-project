import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type TuiIdentityMatcher, type TuiStringHandler } from '@taiga-ui/cdk';
import {
  TuiDataList,
  TuiDropdownOpen,
  TuiFilterByInputPipe,
  type TuiFilterByInputOptions,
  TuiIcon,
  TuiInputDirective,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiChevron, TuiComboBox } from '@taiga-ui/kit';

import { UserRef } from '@core/user/interfaces/user-ref.interface';
import { UserAvatarComponent } from '@shared/components/user-avatar/user-avatar.component';

@Component({
  selector: 'app-task-member-select',
  imports: [
    FormsModule,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiTextfield,
    UserAvatarComponent,
  ],
  templateUrl: './task-member-select.component.html',
  styleUrl: './task-member-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskMemberSelectComponent {
  private readonly textInput = viewChild.required(TuiInputDirective);
  private readonly dropdown = viewChild.required(TuiDropdownOpen);
  readonly members = input.required<readonly UserRef[]>();
  readonly value = model<UserRef | null>(null);
  readonly currentUser = input.required<UserRef>();
  readonly viewOnly = input(false);
  readonly query = linkedSignal<UserRef | string | null>(() => this.value());

  readonly options = computed<readonly (UserRef | null)[]>(() => {
    const me = this.currentUser();

    return [
      me,
      null,
      ...this.members().filter((member) => !this.isSameUser(member, me)),
    ];
  });

  readonly identityMatcher: TuiIdentityMatcher<UserRef | null> =
    this.isSameUser;
  readonly stringify: TuiStringHandler<UserRef | null> = (item) =>
    item?.name ?? '';

  readonly optionFilter: TuiFilterByInputOptions<UserRef | null>['filter'] = (
    items,
    query
  ) => {
    const normalized = query.trim().toLowerCase();

    return this.value()?.name.toLowerCase() === normalized
      ? items
      : items.filter(
          (option) =>
            option === null ||
            this.isSameUser(option, this.currentUser()) ||
            option.name.toLowerCase().includes(normalized)
        );
  };

  isSameUser(
    this: void,
    first: UserRef | null,
    second: UserRef | null
  ): boolean {
    return first?.userId === second?.userId;
  }

  onQueryChange(next: UserRef | string | null): void {
    if (typeof next === 'string') {
      this.query.set(next);
    } else if (next) {
      this.select(next);
    }
  }

  onSearchCancel(): void {
    this.textInput().setValue(this.value());
    this.dropdown().open.set(false);
    this.query.set(this.value());
  }

  select(option: UserRef | null): void {
    this.value.set(option);
  }
}
