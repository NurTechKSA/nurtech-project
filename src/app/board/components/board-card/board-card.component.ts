import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { UserAvatarComponent } from '@shared/components/user-avatar/user-avatar.component';

import { BlockedTaskBadgeComponent } from '../../../task/components/task-blocked-badge/blocked-task-badge.component';
import { TaskKeyComponent } from '../../../task/components/task-key/task-key.component';
import { ParentTaskKeyBadgeComponent } from '../../../task/components/task-parent-key-badge/parent-task-key-badge.component';
import { TaskPriorityBadgeComponent } from '../../../task/components/task-priority-badge/task-priority-badge.component';
import { TaskTagsComponent } from '../../../task/components/task-tags/task-tags.component';
import { TaskTypeIconComponent } from '../../../task/components/task-type-icon/task-type-icon.component';
import { BoardCard } from '../../interfaces/board-card.interface';

const MAX_VISIBLE_TAGS = 2;

@Component({
  selector: 'app-board-card',
  imports: [
    BlockedTaskBadgeComponent,
    ParentTaskKeyBadgeComponent,
    TaskKeyComponent,
    TaskPriorityBadgeComponent,
    TaskTagsComponent,
    TaskTypeIconComponent,
    UserAvatarComponent,
  ],
  templateUrl: './board-card.component.html',
  styleUrl: './board-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCardComponent {
  readonly card = input.required<BoardCard>();
  readonly maxVisibleTags = MAX_VISIBLE_TAGS;
}
