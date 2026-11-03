import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore } from '@ngrx/signals';

export const ProfileStore = signalStore(withDevtools('profile'));
