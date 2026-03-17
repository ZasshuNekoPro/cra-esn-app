import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { RagIndexerService } from './rag-indexer.service';
import { RagEventListenerService } from './rag-event-listener.service';
import { EmbedderService } from '@esn/rag-engine';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: EmbedderService,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('OPENAI_API_KEY') ?? '';
        return new EmbedderService(apiKey);
      },
      inject: [ConfigService],
    },
    RagIndexerService,
    RagEventListenerService,
  ],
  exports: [RagIndexerService],
})
export class RagModule {}
