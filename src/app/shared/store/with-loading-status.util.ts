import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';

import { LoadingStatus } from '../enums/loading-status.enum';

interface StatusState {
  status: LoadingStatus;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function withLoadingStatus() {
  return signalStoreFeature(
    withState<StatusState>({ status: LoadingStatus.INIT }),
    withComputed(({ status }) => ({
      isInit: computed(() => status() === LoadingStatus.INIT),
      isLoading: computed(() => status() === LoadingStatus.LOADING),
      isLoaded: computed(() => status() === LoadingStatus.LOADED),
      isError: computed(() => status() === LoadingStatus.ERROR),
    }))
  );
}
