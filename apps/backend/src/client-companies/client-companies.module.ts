import { Module } from '@nestjs/common';
import { ClientCompaniesController } from './client-companies.controller';
import { ClientCompaniesService } from './client-companies.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientCompaniesController],
  providers: [ClientCompaniesService],
  exports: [ClientCompaniesService],
})
export class ClientCompaniesModule {}