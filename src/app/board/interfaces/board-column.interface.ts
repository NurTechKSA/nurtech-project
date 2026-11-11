import { Status } from '@core/project/interfaces/status.interface';

import { BoardCard } from './board-card.interface';

export interface BoardColumn {
  statusId: Status['id'];
  count: number;
  cards: BoardCard[];
}
