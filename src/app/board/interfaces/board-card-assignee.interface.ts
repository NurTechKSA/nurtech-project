import { User } from '@core/user/interfaces/user.interface';

export interface BoardCardAssignee extends Omit<User, 'id'> {
  userId: User['id'];
}
