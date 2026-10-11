import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withState } from '@ngrx/signals';

import { User } from '../interfaces/user.interface';

interface UserState {
  currentUser: User | null;
}

const initialState: UserState = {
  currentUser: null,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const UserStore = signalStore(
  { providedIn: 'root' },
  withDevtools('user'),

  withState(initialState),

  withMethods((store) => ({
    setUser: (currentUser: User): void => {
      updateState(store, '[UserStore] setUser', { currentUser });
    },
    reset: (): void => {
      updateState(store, '[UserStore] reset', initialState);
    },
  }))
);
