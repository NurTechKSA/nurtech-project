import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';

import { StatusListResponse } from '../interfaces/api/status-list-response.interface';
import { Status } from '../interfaces/status.interface';

@Injectable({ providedIn: 'root' })
export class ApiStatusService {
  private readonly http = inject(HttpClient);

  getStatuses(projectId: Project['id']): Observable<Status[]> {
    return this.http
      .get<StatusListResponse>(`projects/${projectId}/statuses`)
      .pipe(map(({ items }) => items));
  }
}
