import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps } from '@ngrx/signals';
import {
  addEntity,
  removeAllEntities,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { Tag } from '../interfaces/tag.interface';
import { ApiTagService } from '../services/api-tag.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TagStore = signalStore(
  withDevtools('tag'),
  withLoadingStatus(),
  withEntities<Tag>(),
  withProps(() => ({ apiTagService: inject(ApiTagService) })),
  withMethods(({ apiTagService, ...store }) => ({
    loadTags: rxMethod<Project['id']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[TagStore] loadTags',
            removeAllEntities(),
            setLoading()
          );
        }),
        switchMap((projectId) => apiTagService.getTags(projectId)),
        tap((tags) => {
          updateState(
            store,
            '[TagStore] loadTagsSuccess',
            setAllEntities(tags),
            setLoaded()
          );
        }),
        catchEffectError({ store, methodName: '[TagStore] loadTags' })
      )
    ),
    addTag: (tag: Tag): void => {
      updateState(store, '[TagStore] addTag', addEntity(tag));
    },
  }))
);
