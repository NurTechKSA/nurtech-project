import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';

import { SubsystemListResponse } from '../interfaces/api/subsystem-list-response.interface';
import { Subsystem } from '../interfaces/subsystem.interface';

@Injectable({ providedIn: 'root' })
export class ApiSubsystemService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'projects';

  getSubsystems(id: Project['id']): Observable<Subsystem[]> {
    return this.http
      .get<SubsystemListResponse>(`${this.endpoint}/${id}/subsystems`)
      .pipe(map(({ items }) => items));
  }
}
