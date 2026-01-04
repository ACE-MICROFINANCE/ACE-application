import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, StaffRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredRoles.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user || user.actorKind !== 'STAFF') {
      throw new ForbiddenException('Staff role required'); // CHANGED: restrict staff-only routes
    }

    if (!user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role'); // CHANGED: enforce staff roles
    }

    return true;
  }
}
