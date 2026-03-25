import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { ReportsSendService } from '../../../src/reports/reports-send.service';
import { STORAGE_SERVICE } from '../../../src/storage/storage.interface';
import { seedTestData, cleanupTestData, TestContext } from '../helpers/seed.helper';
import type { SendReportResponse } from '@esn/shared-types';

describe('Reports send (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ctx: TestContext;
  let mockSendService: { sendMonthlyReport: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://esn_user:password@localhost:5433/esn_cra_test';
    // Ensure S3 config is present (S3StorageService constructor uses getOrThrow)
    process.env.S3_BUCKET = process.env.S3_BUCKET ?? process.env.S3_BUCKET_NAME ?? 'test-bucket';
    process.env.STORAGE_DRIVER = 'local'; // use local driver to avoid real S3

    mockSendService = {
      sendMonthlyReport: vi.fn(),
    };

    // Override S3 and ReportsSendService so the test doesn't need real S3
    const mockStorageDriver = {
      uploadFile: vi.fn().mockResolvedValue('reports/test.pdf'),
      getDownloadUrl: vi.fn().mockResolvedValue('https://mock/url'),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STORAGE_SERVICE)
      .useValue(mockStorageDriver)
      .overrideProvider(ReportsSendService)
      .useValue(mockSendService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = moduleRef.get(PrismaService);
    ctx = await seedTestData(prisma, app);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const VALID_BODY = {
    reportType: 'CRA_ONLY',
    recipients: ['ESN'],
  };

  const MOCK_RESPONSE: SendReportResponse = {
    success: true,
    sentTo: ['ESN'],
    pdfS3Key: 'reports/emp/2026/3/CRA_ONLY-123.pdf',
    auditLogId: 'audit-1',
    skippedRecipients: [],
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('401 — no Authorization header', async () => {
    await request(app.getHttpServer())
      .post('/api/reports/monthly/2026/3/send')
      .send(VALID_BODY)
      .expect(401);
  });

  // ── Role guard ────────────────────────────────────────────────────────────

  it('403 — ESN_ADMIN cannot call this endpoint', async () => {
    await request(app.getHttpServer())
      .post('/api/reports/monthly/2026/3/send')
      .set('Authorization', `Bearer ${ctx.esnToken}`)
      .send(VALID_BODY)
      .expect(403);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('400 — empty recipients array', async () => {
    await request(app.getHttpServer())
      .post('/api/reports/monthly/2026/3/send')
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .send({ reportType: 'CRA_ONLY', recipients: [] })
      .expect(400);
  });

  it('400 — month=13 in URL → ParseIntPipe accepts it but DTO validation rejects', async () => {
    await request(app.getHttpServer())
      .post('/api/reports/monthly/2026/13/send')
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .send(VALID_BODY)
      .expect(400);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('201 — employee sends report successfully', async () => {
    mockSendService.sendMonthlyReport.mockResolvedValue(MOCK_RESPONSE);

    const res = await request(app.getHttpServer())
      .post('/api/reports/monthly/2026/3/send')
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .send(VALID_BODY)
      .expect(201);

    const body = res.body as SendReportResponse;
    expect(body.success).toBe(true);
    expect(body.sentTo).toContain('ESN');
    expect(mockSendService.sendMonthlyReport).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 3, reportType: 'CRA_ONLY' }),
      ctx.employeeId,
    );
  });
});
