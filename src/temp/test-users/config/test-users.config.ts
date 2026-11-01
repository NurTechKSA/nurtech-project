import { TestUser } from '../interfaces/test-user.interface';

// Тестовые пользователи стенда, роли — в README бэкенда
export const TEST_USERS: TestUser[] = [
  { username: 'anna_owner', description: 'DEMO: owner' },
  { username: 'boris_admin', description: 'DEMO: admin, SIMPLE: owner' },
  { username: 'clara_member', description: 'DEMO, SIMPLE: member' },
  { username: 'denis_member', description: 'DEMO: member' },
  { username: 'eva_viewer', description: 'DEMO: viewer' },
  { username: 'hanna_free', description: 'без проектов' },
];
