import { User } from '@core/user/interfaces/user.interface';

export interface TestUser {
  username: User['username'];
  description: string;
}
