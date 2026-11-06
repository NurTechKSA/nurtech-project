import { User } from '@core/user/interfaces/user.interface';

export interface UserRef extends Omit<User, 'id'> {
  userId: User['id'];
}
