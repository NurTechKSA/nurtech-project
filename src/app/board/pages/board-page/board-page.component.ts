import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { BoardCardsStore } from '../../+store/board-cards.store';
import { BoardToolbarComponent } from '../../components/board-toolbar/board-toolbar.component';
import { Board } from '../../interfaces/board.interface';

@Component({
  // Панель подключается здесь и сама импортирует TuiIcon.
  imports: [BoardToolbarComponent],
  providers: [BoardCardsStore],
  templateUrl: './board-page.component.html',
  styleUrl: './board-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardPageComponent {
  private readonly boardCardsStore = inject(BoardCardsStore);

  readonly boardId = input.required<Board['id']>();
  readonly columns = this.boardCardsStore.columnsWithDetails;

  constructor() {
    this.boardCardsStore.loadBoardCards(this.boardId);
  }
}
