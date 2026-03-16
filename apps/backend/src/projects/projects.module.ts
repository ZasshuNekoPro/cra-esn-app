import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { WeatherService } from './weather.service';
import { CommentsService } from './comments.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, WeatherService, CommentsService],
  exports: [ProjectsService, WeatherService, CommentsService],
})
export class ProjectsModule {}
