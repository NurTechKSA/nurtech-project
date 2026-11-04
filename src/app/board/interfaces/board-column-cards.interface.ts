import { BoardCard } from './board-card.interface';
import { Status } from './status.interface';

export interface BoardColumnCards {
  statusId: Status['id'];
  count: number;
  cards: BoardCard[];
}
