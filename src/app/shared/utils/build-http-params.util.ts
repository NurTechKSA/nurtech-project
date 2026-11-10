import { HttpParams } from '@angular/common/http';

export function buildHttpParams(payload: object): HttpParams {
  let params = new HttpParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    const serialized = Array.isArray(value)
      ? value.filter((v) => v !== '').join(',')
      : String(value);

    if (serialized !== '') {
      params = params.set(key, serialized);
    }
  });

  return params;
}
