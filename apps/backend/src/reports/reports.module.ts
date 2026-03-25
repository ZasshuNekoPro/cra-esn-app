import { Module } from '@nestjs/common';
import { MonthlyReportPdfGenerator } from '@esn/pdf-generator';
import { PrismaModule } from '../database/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ReportsService } from './reports.service';
import { ReportsSendService } from './reports-send.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [ReportsService, ReportsSendService, MonthlyReportPdfGenerator],
  controllers: [ReportsController],
  exports: [ReportsService, ReportsSendService],
})
export class ReportsModule {}
