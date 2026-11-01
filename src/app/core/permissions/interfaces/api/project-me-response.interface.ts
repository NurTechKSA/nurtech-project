import { ProjectRole } from '@core/project/enums/project-role.enum';
import { User } from '@core/user/interfaces/user.interface';

import { ProjectPermission } from '../../enums/project-permission.enum';

export interface ProjectMeResponse {
  userId: User['id'];
  role: ProjectRole;
  permissions: ProjectPermission[];
}
