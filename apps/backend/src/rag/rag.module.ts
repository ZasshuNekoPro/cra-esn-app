import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaModule } from '../database/prisma.module';
import { RagIndexerService } from './rag-indexer.service';
import { RagEventListenerService } from './rag-event-listener.service';
import { RagQueryService } from './rag-query.service';
import { RagSchedulerService } from './rag-scheduler.service';
import { RagController } from './rag.controller';
import { EmbedderService } from '@esn/rag-engine';

@Module({
  imports: [PrismaModule],
  controllers: [RagController],
  providers: [
    {
      provide: EmbedderService,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('OPENAI_API_KEY') ?? '';
        return new EmbedderService(apiKey);
      },
      inject: [ConfigService],
    },
    {
      provide: Anthropic,
      useFactory: (config: ConfigService) => {
        return new Anthropic({ apiKey: config.get<string>('ANTHROPIC_API_KEY') ?? '' });
      },
      inject: [ConfigService],
    },
    RagIndexerService,
    RagEventListenerService,
    RagQueryService,
    RagSchedulerService,
  ],
  exports: [RagIndexerService, RagQueryService],
})
export class RagModule {}
