import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, type, withMethods, withProps } from '@ngrx/signals';
import {
  entityConfig,
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

import { Member } from '../interfaces/member.interface';
import { ApiMemberService } from '../services/api-member.service';

const memberConfig = entityConfig({
  entity: type<Member>(),
  selectId: (member) => member.userId,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MemberStore = signalStore(
  withDevtools('member'),
  withLoadingStatus(),
  withEntities(memberConfig),
  withProps(() => ({ apiMemberService: inject(ApiMemberService) })),
  withMethods(({ apiMemberService, ...store }) => ({
    loadMembers: rxMethod<Project['id']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[MemberStore] loadMembers',
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
  }))
);
