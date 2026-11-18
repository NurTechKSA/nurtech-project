import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type TuiIdentityMatcher } from '@taiga-ui/cdk';
import {
  TuiDataList,
  TuiFilterByInputPipe,
  type TuiFilterByInputOptions,
  TuiIcon,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiChevron, TuiComboBox, TuiStringifyPipe } from '@taiga-ui/kit';

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
    TuiStringifyPipe,
    TuiTextfield,
    UserAvatarComponent,
  ],
  templateUrl: './task-member-select.component.html',
  styleUrl: './task-member-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskMemberSelectComponent {
  readonly members = input.required<readonly UserRef[]>();
  readonly value = model<UserRef | null>(null);
  readonly currentUser = input.required<UserRef>();
  readonly viewOnly = input(false);

  readonly options = computed<readonly (UserRef | null)[]>(() => {
    const me = this.currentUser();

    return [
      me,
      null,
      ...this.members().filter((member) => !this.isSameUser(member, me)),
    ];
  });

  readonly identityMatcher: TuiIdentityMatcher<unknown> = (first, second) =>
    this.isSameUser(first as UserRef | null, second as UserRef | null);

  readonly isSameUser = (
    first: UserRef | null,
    second: UserRef | null
  ): boolean => first?.userId !== undefined && first.userId === second?.userId;

  readonly optionFilter: TuiFilterByInputOptions<UserRef | null>['filter'] = (
    items,
    query
  ) => {
    const normalized = query.toLowerCase();

    return this.value()?.name.toLowerCase() === normalized
      ? items
      : items.filter(
          (option) =>
            option === null ||
            this.isSameUser(option, this.currentUser()) ||
            option.name.toLowerCase().includes(normalized)
        );
  };
}
