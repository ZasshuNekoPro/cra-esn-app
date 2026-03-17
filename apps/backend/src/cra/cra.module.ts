import { Module } from '@nestjs/common';
import { CraService } from './cra.service';
import { CraSignatureService } from './cra-signature.service';
import { CraPdfService } from './cra-pdf.service';
import { CraController } from './cra.controller';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, NotificationsModule, StorageModule, EventEmitterModule],
  controllers: [CraController],
  providers: [CraService, CraSignatureService, CraPdfService],
  exports: [CraService, CraSignatureService, CraPdfService],
})
export class CraModule {}
