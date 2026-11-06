import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { TaskDetail } from '../interfaces/task-detail.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiTaskService {
  getTaskByKey(_projectId: string, _key: string): Observable<TaskDetail> {
    return throwError(
      () => new Error('ApiTaskService.getTaskByKey is not implemented yet')
    );
  }
}
