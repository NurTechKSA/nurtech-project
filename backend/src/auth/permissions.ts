import type { Role } from '../db/schema.js';

export type Permission =
  | 'project-view'
  | 'board-view'
  | 'task-view'
  | 'member-list'
  | 'comment-create'
  | 'comment-update'
  | 'comment-delete'
  | 'task-create'
  | 'task-update'
  | 'task-move'
  | 'link-manage'
  | 'worklog-create'
  | 'worklog-update'
  | 'worklog-delete'
  | 'tag-create';

/** Порядок - как в enum ProjectPermission контракта */
export const ALL_PERMISSIONS: Permission[] = [
  'project-view',
  'board-view',
  'task-view',
  'member-list',
  'comment-create',
  'comment-update',
  'comment-delete',
  'task-create',
  'task-update',
  'task-move',
  'link-manage',
  'worklog-create',
  'worklog-update',
  'worklog-delete',
  'tag-create',
];

const VIEWER: Permission[] = [
  'project-view',
  'board-view',
  'task-view',
  'member-list',
  'comment-create',
  'comment-update',
  'comment-delete',
];
const MEMBER: Permission[] = [
  ...VIEWER,
  'task-create',
  'task-update',
  'task-move',
  'link-manage',
  'worklog-create',
  'worklog-update',
  'worklog-delete',
  'tag-create',
];

/** Матрица docs-short/08, раздел 4. В MVP admin и owner по правам не различаются. */
const MATRIX: Record<Role, Set<Permission>> = {
  viewer: new Set(VIEWER),
  member: new Set(MEMBER),
  admin: new Set(MEMBER),
  owner: new Set(MEMBER),
};

export function permissionsOf(role: Role): Permission[] {
  return ALL_PERMISSIONS.filter((p) => MATRIX[role].has(p));
}

export function can(role: Role, perm: Permission): boolean {
  return MATRIX[role].has(perm);
}

export function isProjectAdmin(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}
