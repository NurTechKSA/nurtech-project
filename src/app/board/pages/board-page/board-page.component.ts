import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TuiLoader, TuiScrollControls, TuiScrollRef } from '@taiga-ui/core';

import { BoardCardsStore } from '../../+store/board-cards.store';
import { BoardColumnComponent } from '../../components/board-column/board-column.component';
import { Board } from '../../interfaces/board.interface';

@Component({
  templateUrl: './board-page.component.html',
  styleUrl: './board-page.component.scss',
  imports: [BoardColumnComponent, TuiLoader, TuiScrollControls, TuiScrollRef],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BoardCardsStore],
})
export class BoardPageComponent {
  private readonly boardCardsStore = inject(BoardCardsStore);

  readonly boardId = input.required<Board['id']>();
  readonly board = this.boardCardsStore.currentBoard;
  readonly columns = this.boardCardsStore.columnsWithDetails;
  readonly isLoading = this.boardCardsStore.isLoading;

  constructor() {
    this.boardCardsStore.loadBoardCards(this.boardId);
  }
}
