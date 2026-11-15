import { HttpParams, HttpParamsOptions } from '@angular/common/http';

type ParamValue =
  NonNullable<HttpParamsOptions['fromObject']>[string] | null | undefined;
type FlatPayload<T> = { [K in keyof T]: ParamValue };

const isPresent = <T>(item: T): item is NonNullable<T> =>
  // eslint-disable-next-line sonarjs/different-types-comparison
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
