import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { WeatherService } from './weather.service';
import { CommentsService } from './comments.service';
import { MilestonesService } from './milestones.service';
import { ValidationsService } from './validations.service';
import { ProjectSchedulerService } from './scheduler.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, NotificationsModule, EventEmitterModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, WeatherService, CommentsService, MilestonesService, ValidationsService, ProjectSchedulerService],
  exports: [ProjectsService, WeatherService, CommentsService, MilestonesService, ValidationsService],
})
export class ProjectsModule {}
