import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';

import { ProjectMeResponse } from '../interfaces/api/project-me-response.interface';

@Injectable({ providedIn: 'root' })
export class ApiPermissionService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'projects';

  getProjectPermissions(id: Project['id']): Observable<ProjectMeResponse> {
    return this.http.get<ProjectMeResponse>(`${this.endpoint}/${id}/me`);
  }
}
