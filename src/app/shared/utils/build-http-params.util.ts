// import { HttpParams } from '@angular/common/http';

import { HttpParams } from '@angular/common/http';

// export function buildHttpParams(payload: unknown): HttpParams {
//   let params = new HttpParams();
//   Object.entries(payload).map(([key, value]) => )
// }

// //   protected getParams(params: IProductsQuery): string {
// //     if (typeof params === 'object') {
// //       return Object.entries(params)
// //         .map(([key, value]) => this.getParam(key, value))
// //         .filter(Boolean)
// //         .join('&');
// //     } else {
// //       return '';
// //     }
// //   }

//   function getParam(name: string, value: unknown): string {
//     if (value) {
//       return `${ name }=${ value }`;
//     } else {
//       return '';
//     }
//   }

export function getParams(payload: unknown): HttpParams {
  let params = new HttpParams();

  if (typeof payload === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  } else {
    return new HttpParams();
  }
}
