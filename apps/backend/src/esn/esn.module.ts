import { Module } from '@nestjs/common';
import { EsnController } from './esn.controller';
import { EsnService } from './esn.service';

@Module({
  controllers: [EsnController],
  providers: [EsnService],
  exports: [EsnService],
})
export class EsnModule {}
