import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { BoardStore } from '../../+store/board.store';
import { Board } from '../../interfaces/board.interface';

@Component({
  templateUrl: './board-page.component.html',
  styleUrl: './board-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardPageComponent {
  private readonly boardStore = inject(BoardStore);

  readonly boardId = input.required<Board['id']>();
  readonly columns = computed(() => {
    const statusNames = new Map(
      this.boardStore.statuses().map(({ id, name }) => [id, name])
    );

    return this.boardStore.columns().map((column) => ({
      ...column,
      name: statusNames.get(column.statusId) ?? column.statusId,
    }));
  });

  constructor() {
    this.boardStore.loadBoardCards(this.boardId);
  }
}
