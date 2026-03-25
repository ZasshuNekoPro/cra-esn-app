import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

const mockPrisma = {
  $queryRaw: vi.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new HealthController(mockPrisma as never);
  });

  it('returns { status: ok, db: connected } when DB is reachable', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('connected');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws ServiceUnavailableException (503) when DB is unreachable', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB connection refused'));

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });

  it('includes timestamp in the response', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const before = new Date().toISOString();
    const result = await controller.check();
    const after = new Date().toISOString();

    expect(result.timestamp >= before).toBe(true);
    expect(result.timestamp <= after).toBe(true);
  });
});
