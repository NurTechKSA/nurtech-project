import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { ProjectStore } from '@core/project/+store/project.store';

import { BoardCardsStore } from '../../+store/board-cards.store';
import { BoardStore } from '../../+store/board.store';
import { Board } from '../../interfaces/board.interface';

@Component({
  providers: [BoardStore, BoardCardsStore],
  templateUrl: './board-page.component.html',
  styleUrl: './board-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardPageComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly boardStore = inject(BoardStore);
  private readonly boardCardsStore = inject(BoardCardsStore);

  readonly boardId = input.required<Board['id']>();
  readonly columns = this.boardCardsStore.columnsWithDetails;

  constructor() {
    this.boardStore.loadBoards(this.projectStore.currentProjectId);
    this.boardCardsStore.loadBoardCards(this.boardId);
  }
}
