import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type StaffRole = 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM';

export const Roles = (...roles: StaffRole[]) =>
  SetMetadata(ROLES_KEY, roles); // CHANGED: attach staff roles metadata
