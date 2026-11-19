import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiCardMedium } from '@taiga-ui/layout';

import { UserAvatarComponent } from '@shared/components/user-avatar/user-avatar.component';

import { BoardCard } from '../../interfaces/board-card.interface';

@Component({
  selector: 'app-board-card',
  imports: [TuiCardMedium, UserAvatarComponent],
  templateUrl: './board-card.component.html',
  styleUrl: './board-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCardComponent {
  readonly card = input.required<BoardCard>();
}
