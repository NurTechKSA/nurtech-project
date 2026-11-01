import { ProjectRole } from '../enums/project-role.enum';

export interface Project {
  id: string;
  key: string;
  name: string;
  role: ProjectRole;
}
