import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTaiga } from '@taiga-ui/core';

import { TaskCardComponent } from './task-card.component';
import { TaskStore } from '../../+store/task.store';

describe('TaskCardComponent loading lifecycle', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTaiga(),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('reloads on input changes and cancels the request when destroyed', () => {
    const fixture = TestBed.createComponent(TaskCardComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.componentRef.setInput('taskKey', 'DEMO-1');
    fixture.detectChanges();
    const first = http.expectOne('projects/project-1/tasks/by-key/DEMO-1');

    fixture.componentRef.setInput('taskKey', 'DEMO-2');
    fixture.detectChanges();
    expect(first.cancelled).toBe(true);
    const second = http.expectOne('projects/project-1/tasks/by-key/DEMO-2');
    second.flush(null, { status: 404, statusText: 'Not Found' });
    expect(fixture.debugElement.injector.get(TaskStore).isError()).toBe(true);

    fixture.componentRef.setInput('projectId', 'project-2');
    fixture.detectChanges();
    const third = http.expectOne('projects/project-2/tasks/by-key/DEMO-2');
    fixture.destroy();
    expect(third.cancelled).toBe(true);
  });

  it('provides a separate store for each card', () => {
    const first = TestBed.createComponent(TaskCardComponent);
    const second = TestBed.createComponent(TaskCardComponent);
    const firstStore = first.debugElement.injector.get(TaskStore);
    const secondStore = second.debugElement.injector.get(TaskStore);
    expect(firstStore).not.toBe(secondStore);
    first.destroy();
    second.destroy();
  });
});
