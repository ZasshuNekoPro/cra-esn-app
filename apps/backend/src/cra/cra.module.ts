import { Module } from '@nestjs/common';
import { CraService } from './cra.service';
import { CraSignatureService } from './cra-signature.service';
import { CraController } from './cra.controller';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CraController],
  providers: [CraService, CraSignatureService],
  exports: [CraService, CraSignatureService],
})
export class CraModule {}
