import { BoardColumn } from './board-column.interface';
import { BoardStatus } from './board-status.interface';

export type BoardColumnViewModel = BoardColumn &
  Pick<BoardStatus, 'name'> &
  Partial<Pick<BoardStatus, 'color' | 'category' | 'requiresReason'>>;
