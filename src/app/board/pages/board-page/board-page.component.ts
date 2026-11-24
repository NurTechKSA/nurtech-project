import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TuiScrollControls, TuiScrollRef } from '@taiga-ui/core';

import { BoardCardsStore } from '../../+store/board-cards.store';
import { BoardColumnComponent } from '../../components/board-column/board-column.component';
import { Board } from '../../interfaces/board.interface';

@Component({
  templateUrl: './board-page.component.html',
  styleUrl: './board-page.component.scss',
  imports: [BoardColumnComponent, TuiScrollControls, TuiScrollRef],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BoardCardsStore],
})
export class BoardPageComponent {
  private readonly boardCardsStore = inject(BoardCardsStore);

  readonly boardId = input.required<Board['id']>();
  readonly board = this.boardCardsStore.currentBoard;
  readonly columns = this.boardCardsStore.columnsWithDetails;

  constructor() {
    this.boardCardsStore.loadBoardCards(this.boardId);
  }
}
