import { User } from './user.interface';

export interface UserRef extends Pick<User, 'name' | 'username'> {
  userId: User['id'];
}
