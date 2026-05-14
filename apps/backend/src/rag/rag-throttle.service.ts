import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const USER_LIMIT = 20;
const ESN_LIMIT = 200;
const WINDOW_SECONDS = 3600; // 1 hour

@Injectable()
export class RagThrottleService {
  private readonly logger = new Logger(RagThrottleService.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379'));
    this.redis.on('error', (err) => this.logger.error('Redis throttle error', err));
  }

  async checkInformationMode(userId: string, esnId: string | null | undefined): Promise<void> {
    await this.checkLimit(`rag-info:user:${userId}`, USER_LIMIT, 'Limite atteinte (20 requêtes/heure)');

    if (esnId) {
      await this.checkLimit(`rag-info:esn:${esnId}`, ESN_LIMIT, 'Limite ESN atteinte (200 requêtes/heure)');
    }
  }

  private async checkLimit(key: string, limit: number, message: string): Promise<void> {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, WINDOW_SECONDS);
      }
      if (count > limit) {
        throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis unavailable — degrade gracefully, log and continue
      this.logger.warn(`Redis throttle check failed for key ${key}: ${String(err)}`);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
