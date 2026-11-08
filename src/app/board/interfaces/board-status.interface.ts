import { Status } from '../../task/interfaces/status.interface';

export interface BoardStatus extends Omit<Status, 'id'> {
  statusId: Status['id'];
}
