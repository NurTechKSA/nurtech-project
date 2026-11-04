import { BoardColumn } from './board-column.interface';

export interface Board {
  id: string;
  name: string;
  columns: BoardColumn[];
  doneWindowDays: number;
}
