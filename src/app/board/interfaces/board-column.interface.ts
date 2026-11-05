import { Status } from '../../task/interfaces/status.interface';

export interface BoardColumn {
  statusId: Status['id'];
  name: Status['name'];
  color: Status['color'];
  category: Status['category'];
  requiresReason: Status['requiresReason'];
}
