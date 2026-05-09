import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { MissionPrimaryGuard } from '../common/guards/mission-primary.guard';

@Module({
  imports: [PrismaModule],
  controllers: [MissionsController],
  providers: [MissionsService, MissionPrimaryGuard],
  exports: [MissionsService],
})
export class MissionsModule {}
