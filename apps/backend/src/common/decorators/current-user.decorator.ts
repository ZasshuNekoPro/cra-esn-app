import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@esn/shared-types';

interface RequestWithUser {
  user: JwtPayload;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
