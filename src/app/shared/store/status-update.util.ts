import { LoadingStatus } from '../enums/loading-status.enum';

type DefaultStatusKey = 'status';

type StatusState<K extends string> = Record<K, LoadingStatus>;

const defaultStatusKey: DefaultStatusKey = 'status';

function createStatusState<K extends string>(
  statusKey: K | undefined,
  status: LoadingStatus
): StatusState<K | DefaultStatusKey> {
  const key = statusKey ?? defaultStatusKey;

  return { [key]: status } as StatusState<K | DefaultStatusKey>;
}

export function setLoading(): StatusState<DefaultStatusKey>;
export function setLoading<K extends string>(statusKey: K): StatusState<K>;

export function setLoading<K extends string>(
  statusKey?: K
): StatusState<K | DefaultStatusKey> {
  return createStatusState(statusKey, LoadingStatus.LOADING);
}

export function setLoaded(): StatusState<DefaultStatusKey>;
export function setLoaded<K extends string>(statusKey: K): StatusState<K>;

export function setLoaded<K extends string>(
  statusKey?: K
): StatusState<K | DefaultStatusKey> {
  return createStatusState(statusKey, LoadingStatus.LOADED);
}

export function setError(): StatusState<DefaultStatusKey>;
export function setError<K extends string>(statusKey?: K): StatusState<K>;

export function setError<K extends string>(
  statusKey?: K
): StatusState<K | DefaultStatusKey> {
  return createStatusState(statusKey, LoadingStatus.ERROR);
}
