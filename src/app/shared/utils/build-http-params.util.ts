import { HttpParams } from '@angular/common/http';

export function buildHttpParams(payload: object): HttpParams {
  let params = new HttpParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === '') return;

    const serialized = Array.isArray(value) ? value.join(',') : String(value);

    params = params.set(key, serialized);
  });

  return params;
}
