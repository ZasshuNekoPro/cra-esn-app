import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RagIndexerService } from './rag-indexer.service';
import type { RagIndexEvent } from '@esn/shared-types';

/** Listens to domain events emitted by backend modules and triggers RAG indexing. */
@Injectable()
export class RagEventListenerService {
  private readonly logger = new Logger(RagEventListenerService.name);

  constructor(private readonly indexer: RagIndexerService) {}

  @OnEvent('rag.index.cra_entry')
  async onCraEntry(payload: RagIndexEvent): Promise<void> {
    this.logger.debug(`Indexing cra_entry ${payload.sourceId}`);
    await this.indexer.indexCraEntry(payload.sourceId, payload.employeeId);
  }

  @OnEvent('rag.index.cra_month')
  async onCraMonth(payload: RagIndexEvent): Promise<void> {
    this.logger.debug(`Indexing cra_month ${payload.sourceId}`);
    await this.indexer.indexCraMonth(payload.sourceId, payload.employeeId);
  }

  @OnEvent('rag.index.project_comment')
  async onProjectComment(payload: RagIndexEvent): Promise<void> {
    this.logger.debug(`Indexing project_comment ${payload.sourceId}`);
    await this.indexer.indexProjectComment(payload.sourceId, payload.employeeId);
  }

  @OnEvent('rag.index.weather_entry')
  async onWeatherEntry(payload: RagIndexEvent): Promise<void> {
    this.logger.debug(`Indexing weather_entry ${payload.sourceId}`);
    await this.indexer.indexWeatherEntry(payload.sourceId, payload.employeeId);
  }

  @OnEvent('rag.index.milestone')
  async onMilestone(payload: RagIndexEvent): Promise<void> {
    this.logger.debug(`Indexing milestone ${payload.sourceId}`);
    await this.indexer.indexMilestone(payload.sourceId, payload.employeeId);
  }

  @OnEvent('rag.index.document')
  async onDocument(payload: RagIndexEvent): Promise<void> {
    this.logger.debug(`Indexing document ${payload.sourceId}`);
    await this.indexer.indexDocument(payload.sourceId, payload.employeeId);
  }
}
