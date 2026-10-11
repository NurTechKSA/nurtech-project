export interface OptionalCallback<T = void> {
  callback?: (value: T) => void;
}
