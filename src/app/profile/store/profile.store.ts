import { computed, inject } from '@angular/core';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withComputed } from '@ngrx/signals';

import { UserStore } from '@core/user/+store/user.store';

export const profileStore = signalStore(
  withDevtools('profile'),
  withComputed(() => {
    const userStore = inject(UserStore);

    return {
      currentUser: computed(() => userStore.currentUser()),
    };
  })
);
