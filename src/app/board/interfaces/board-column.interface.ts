import { BoardCard } from './board-card.interface';
import { Status } from '../../task/interfaces/status.interface';

export interface BoardColumn {
  statusId: Status['id'];
  count: number;
  cards: BoardCard[];
}
