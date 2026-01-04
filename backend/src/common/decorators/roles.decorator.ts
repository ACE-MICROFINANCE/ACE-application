import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type StaffRole = 'ADMIN' | 'BRANCH_MANAGER';

export const Roles = (...roles: StaffRole[]) =>
  SetMetadata(ROLES_KEY, roles); // CHANGED: attach staff roles metadata
