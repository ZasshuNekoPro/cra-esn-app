import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface RequestWithUser {
  user: { sub: string };
  params: Record<string, string>;
}

/** Verifies that the authenticated user is the primary employee of the mission (:id param). */
@Injectable()
export class MissionPrimaryGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const missionId = req.params['id'];
    const userId = req.user.sub;

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: { employeeId: true },
    });

    if (!mission) throw new NotFoundException('Mission introuvable');
    if (mission.employeeId !== userId) throw new ForbiddenException('Seul l\'employé principal peut modifier ce paramètre');

    return true;
  }
}
