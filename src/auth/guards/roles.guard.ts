import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../roles/role.enum';
import { ROLES_KEY } from '../roles/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: Role } }>();
    const { user } = request;
    if (!user) {
      throw new ForbiddenException('You do not have permission');
    }

    const hasRequiredRole = requiredRoles.some((role) => role === user.role);
    if (!hasRequiredRole) {
      throw new ForbiddenException('You do not have permission (roles)');
    }
    return true;
  }
}
