import { BoardStatus } from './board-status.interface';

export interface Board {
  id: string;
  name: string;
  columns: BoardStatus[];
  doneWindowDays: number;
}
