import { Module } from '@nestjs/common';
import { CraService } from './cra.service';
import { CraController } from './cra.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CraController],
  providers: [CraService],
  exports: [CraService],
})
export class CraModule {}
