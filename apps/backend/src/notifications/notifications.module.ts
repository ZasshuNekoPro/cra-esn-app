import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailerService } from './mailer.service';
import { PrismaModule } from '../database/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, MailerService],
  controllers: [NotificationsController],
  exports: [NotificationsService, MailerService],
})
export class NotificationsModule {}
