import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/users/interfaces';

export const META_ROLES = 'roles';

export const RoleProtected = (...args: Role[]) => {
  return SetMetadata(META_ROLES, args);
};
