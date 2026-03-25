import { Module } from '@nestjs/common';
import { MonthlyReportPdfGenerator } from '@esn/pdf-generator';
import { PrismaModule } from '../database/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportsService } from './reports.service';
import { ReportsSendService } from './reports-send.service';
import { ReportsValidateService } from './reports-validate.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [PrismaModule, StorageModule, NotificationsModule],
  providers: [ReportsService, ReportsSendService, ReportsValidateService, MonthlyReportPdfGenerator],
  controllers: [ReportsController],
  exports: [ReportsService, ReportsSendService, ReportsValidateService],
})
export class ReportsModule {}
