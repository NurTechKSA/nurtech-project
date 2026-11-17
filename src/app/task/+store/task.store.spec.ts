import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { StatusCategory } from '@status/enums/status-category.enum';
import { StatusColor } from '@status/enums/status-color.enum';

import { TaskStore } from './task.store';
import { Priority } from '../enums/priority.enum';
import { TaskType } from '../enums/task-type.enum';
import { TaskDetail } from '../interfaces/task-detail.interface';

const task: TaskDetail = {
  id: 'task-1',
  key: 'DEMO-1',
  type: TaskType.TASK,
  title: 'First task',
  status: {
    id: 'todo',
    name: 'To do',
    color: StatusColor.GRAY,
    category: StatusCategory.TODO,
  },
  description: null,
  priority: Priority.MEDIUM,
  assignee: null,
  reviewer: null,
  reporter: { userId: 'user-1', name: 'Test user', username: 'test' },
  subsystem: null,
  tags: [],
  dueDate: null,
  isOverdue: false,
  estimateMinutes: null,
  spentMinutes: 0,
  parent: null,
  blocked: false,
  commentCount: 0,
  subtasks: [],
  subtasksEstimateMinutes: 0,
  subtasksSpentMinutes: 0,
  links: [],
  urls: [],
  createdAt: '2026-11-17T10:00:00Z',
  updatedAt: '2026-11-17T10:00:00Z',
};

describe('TaskStore', () => {
  let store: InstanceType<typeof TaskStore>;
  let http: HttpTestingController;
  const sendToDevtools = vi.fn();

  beforeEach(() => {
    sendToDevtools.mockClear();
    vi.stubGlobal('__REDUX_DEVTOOLS_EXTENSION__', {
      connect: () => ({ send: sendToDevtools }),
    });
    TestBed.configureTestingModule({
      providers: [TaskStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(TaskStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('sends task data and loading status to DevTools', () => {
    load();
    TestBed.tick();
    expect(sendToDevtools).toHaveBeenLastCalledWith(expect.anything(), {
      task: { task: null, status: LoadingStatus.LOADING },
    });
    respond();
    TestBed.tick();
    expect(sendToDevtools).toHaveBeenLastCalledWith(expect.anything(), {
      task: { task, status: LoadingStatus.LOADED },
    });
  });

  function load(key = 'DEMO-1', projectId = 'project-1'): void {
    TestBed.runInInjectionContext(() => store.loadTask({ projectId, key }));
  }

  function respond(value: TaskDetail = task): void {
    http.expectOne(`projects/project-1/tasks/by-key/${value.key}`).flush(value);
  }

  it('clears the previous task until the next response arrives', () => {
    load();
    respond();
    expect(store.task()).toEqual(task);
    expect(store.isLoaded()).toBe(true);

    load('DEMO-2');
    expect(store.task()).toBeNull();
    expect(store.isLoading()).toBe(true);

    const nextTask = { ...task, id: 'task-2', key: 'DEMO-2' };
    respond(nextTask);
    expect(store.task()).toEqual(nextTask);
    expect(store.isLoaded()).toBe(true);
  });

  it('cancels the previous request when the key changes', () => {
    load();
    const previous = http.expectOne('projects/project-1/tasks/by-key/DEMO-1');
    load('DEMO-2');
    expect(previous.cancelled).toBe(true);
    const nextTask = { ...task, id: 'task-2', key: 'DEMO-2' };
    respond(nextTask);
    expect(store.task()).toEqual(nextTask);
  });

  it('accepts another load after a failed request', () => {
    load();
    http.expectOne('projects/project-1/tasks/by-key/DEMO-1').flush(null, {
      status: 404,
      statusText: 'Not Found',
    });
    expect(store.isError()).toBe(true);
    expect(store.task()).toBeNull();

    load();
    expect(store.isLoading()).toBe(true);
    respond();
    expect(store.task()).toEqual(task);
    expect(store.isLoaded()).toBe(true);
  });

  it('replaces the full current task and rejects an unrelated response', () => {
    load();
    respond();
    const updated = { ...task, title: 'Updated task', commentCount: 3 };
    store.setTask(updated);
    expect(store.task()).toEqual(updated);

    store.setTask({ ...task, id: 'other-task' });
    expect(store.task()).toEqual(updated);
    expect(store.isLoaded()).toBe(true);
  });

  it('ignores a save response while another task is loading', () => {
    load();
    respond();
    load('DEMO-2');
    store.setTask({ ...task, title: 'Late save' });
    expect(store.task()).toBeNull();
    expect(store.isLoading()).toBe(true);
    respond({ ...task, id: 'task-2', key: 'DEMO-2' });
  });

  it('reacts to both key and project signals after an error', () => {
    const projectId = signal('project-1');
    const key = signal('DEMO-1');
    TestBed.runInInjectionContext(() =>
      store.loadTask(() => ({ projectId: projectId(), key: key() }))
    );
    TestBed.tick();
    http.expectOne('projects/project-1/tasks/by-key/DEMO-1').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    key.set('DEMO-2');
    TestBed.tick();
    const previous = http.expectOne('projects/project-1/tasks/by-key/DEMO-2');
    projectId.set('project-2');
    TestBed.tick();
    expect(previous.cancelled).toBe(true);
    http.expectOne('projects/project-2/tasks/by-key/DEMO-2').flush({
      ...task,
      id: 'task-2',
      key: 'DEMO-2',
    });
    expect(store.isLoaded()).toBe(true);
  });

  it('keeps instances independent and cancels work when their injector is destroyed', () => {
    const scope = createEnvironmentInjector(
      [TaskStore],
      TestBed.inject(EnvironmentInjector)
    );

    try {
      const otherStore = scope.get(TaskStore);
      load();
      const pending = http.expectOne('projects/project-1/tasks/by-key/DEMO-1');
      otherStore.loadTask(
        { projectId: 'project-2', key: 'OTHER-1' },
        { injector: scope }
      );
      const otherPending = http.expectOne(
        'projects/project-2/tasks/by-key/OTHER-1'
      );
      pending.flush(task);
      expect(store.task()).toEqual(task);
      expect(otherStore.task()).toBeNull();
      scope.destroy();
      expect(otherPending.cancelled).toBe(true);
      expect(store.task()).toEqual(task);
    } finally {
      if (!scope.destroyed) {
        scope.destroy();
      }
    }
  });
});
