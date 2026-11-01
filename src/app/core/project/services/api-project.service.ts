import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ProjectListResponse } from '../interfaces/api/project-list-response.interface';
import { Project } from '../interfaces/project.interface';

@Injectable({ providedIn: 'root' })
export class ApiProjectService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'projects';

  getProjects(): Observable<Project[]> {
    return this.http
      .get<ProjectListResponse>(this.endpoint)
      .pipe(map(({ items }) => items));
  }
}
