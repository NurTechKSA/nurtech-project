import { HttpParams } from '@angular/common/http';

type Primitive = string | number | boolean;
type Nullish = null | undefined;
type ParamValue = Primitive | Nullish | readonly (Primitive | Nullish)[];

export type FlatPayload<T> = { [K in keyof T]: ParamValue };

const isPresent = (item: Primitive | Nullish): item is Primitive =>
  item !== null && item !== undefined && item !== '';

const serialize = (value: ParamValue): string | null => {
  const items = [value].flat().filter(isPresent);

  return items.length > 0 ? items.join(',') : null;
};

export function buildHttpParams<T extends FlatPayload<T>>(
  payload: T
): HttpParams {
  return Object.entries<ParamValue>(payload).reduce((params, [key, value]) => {
    const serialized = serialize(value);

    return serialized === null ? params : params.set(key, serialized);
  }, new HttpParams());
}
