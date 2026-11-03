import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { MeResponse } from '@core/authentication/interfaces/api/me-response.interface';

export interface UpdatePasswordRequest {
  current: string;
  next: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'profile';

  updateName(name: string): Observable<MeResponse> {
    return this.http.patch<MeResponse>(this.endpoint, { name });
  }

  updatePassword(payload: UpdatePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/password`, payload);
  }
}
