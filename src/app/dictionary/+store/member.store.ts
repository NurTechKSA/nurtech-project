import { effect, inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalStore,
  type,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  entityConfig,
  removeAllEntities,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { UserStore } from '@core/user/+store/user.store';
import { UserRef } from '@core/user/interfaces/user-ref.interface';
import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { ApiMemberService } from '../services/api-member.service';

interface MemberState {
  projectId: Project['id'] | null;
}

const initialState: MemberState = {
  projectId: null,
};

const memberConfig = entityConfig({
  entity: type<UserRef>(),
  selectId: (member) => member.userId,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MemberStore = signalStore(
  { providedIn: 'root' },
  withDevtools('member'),

  withLoadingStatus(),

  withState(initialState),
  withEntities(memberConfig),

  withProps(() => ({
    apiMemberService: inject(ApiMemberService),
    userStore: inject(UserStore),
  })),

  withMethods(({ apiMemberService, ...store }) => ({
    loadMembers: rxMethod<Project['id']>(
      pipe(
        filter(
          (projectId) => projectId !== store.projectId() || store.isError()
        ),
        tap((projectId) => {
          updateState(
            store,
            '[MemberStore] loadMembers',
            { projectId },
            removeAllEntities(),
            setLoading()
          );
        }),
        switchMap((projectId) => apiMemberService.getMembers(projectId)),
        tap((members) => {
          updateState(
            store,
            '[MemberStore] loadMembersSuccess',
            setAllEntities(members, memberConfig),
            setLoaded()
          );
        }),
        catchEffectError({ store, methodName: '[MemberStore] loadMembers' })
      )
    ),
    reset: (): void => {
      updateState(
        store,
        '[MemberStore] reset',
        initialState,
        removeAllEntities(),
        { status: LoadingStatus.INIT }
      );
    },
  })),

  withHooks(({ userStore, reset }) => ({
    onInit(): void {
      effect(() => {
        if (!userStore.currentUser()) {
          reset();
        }
      });
    },
  }))
);
