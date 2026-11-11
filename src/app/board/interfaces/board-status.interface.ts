import { Status } from '@core/project/interfaces/status.interface';

export interface BoardStatus extends Omit<Status, 'id'> {
  statusId: Status['id'];
}
