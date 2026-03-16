import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@esn/shared-types';
import { RESOURCE_OWNER_KEY } from '../decorators/resource-owner.decorator';

interface RequestWithUser {
  user: { id: string; role: Role };
  params: Record<string, string>;
}

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const paramKey = this.reflector.getAllAndOverride<string | null>(RESOURCE_OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!paramKey) {
      return true;
    }

    const { user, params } = context.switchToHttp().getRequest<RequestWithUser>();

    // ESN admins can access any resource
    if (user.role === Role.ESN_ADMIN) {
      return true;
    }

    const resourceOwnerId = params[paramKey];

    if (user.id !== resourceOwnerId) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}
