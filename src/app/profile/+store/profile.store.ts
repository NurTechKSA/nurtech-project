import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore } from '@ngrx/signals';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ProfileStore = signalStore(withDevtools('profile'));
