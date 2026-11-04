import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { MeResponse } from '@core/authentication/interfaces/api/me-response.interface';
import { User } from '@core/user/interfaces/user.interface';

import { ChangePasswordRequest } from '../interfaces/api/change-password-request.interface';
import { UpdateProfileRequest } from '../interfaces/api/update-profile-request.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiProfileService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'profile';

  updateName(payload: UpdateProfileRequest): Observable<User> {
    return this.http
      .patch<MeResponse>(this.endpoint, payload)
      .pipe(map(({ user }) => user));
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/password`, payload);
  }
}
