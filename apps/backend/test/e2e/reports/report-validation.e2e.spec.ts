import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { seedTestData, cleanupTestData, TestContext } from '../helpers/seed.helper';

/**
 * T1 — ReportValidationRequest Prisma model
 * These tests verify DB-level constraints: creation, unique token, FK relation.
 */
describe('ReportValidationRequest — Prisma model (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ctx: TestContext;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://esn_user:password@localhost:5433/esn_cra_test';
    process.env.STORAGE_DRIVER = 'local';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    ctx = await seedTestData(prisma, app);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  afterEach(async () => {
    await prisma.reportValidationRequest.deleteMany({
      where: { employeeId: ctx.employeeId },
    });
  });

  // ── Création ────────────────────────────────────────────────────────────────

  it('creates a ReportValidationRequest and retrieves it by token', async () => {
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

    const created = await prisma.reportValidationRequest.create({
      data: {
        employeeId: ctx.employeeId,
        year: 2026,
        month: 3,
        reportType: 'CRA_ONLY',
        recipient: 'ESN',
        pdfS3Key: 'reports/test/2026/3/CRA_ONLY-123.pdf',
        expiresAt,
      },
    });

    expect(created.id).toBeDefined();
    expect(created.token).toBeDefined();
    expect(created.status).toBe('PENDING');
    expect(created.comment).toBeNull();
    expect(created.resolvedBy).toBeNull();
    expect(created.resolvedAt).toBeNull();

    // Retrieve by token
    const found = await prisma.reportValidationRequest.findUnique({
      where: { token: created.token },
    });
    expect(found).not.toBeNull();
    expect(found!.employeeId).toBe(ctx.employeeId);
    expect(found!.year).toBe(2026);
    expect(found!.month).toBe(3);
    expect(found!.reportType).toBe('CRA_ONLY');
    expect(found!.recipient).toBe('ESN');
  });

  it('stores all fields correctly when created with overrides', async () => {
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);

    const created = await prisma.reportValidationRequest.create({
      data: {
        employeeId: ctx.employeeId,
        year: 2026,
        month: 3,
        reportType: 'CRA_WITH_WEATHER',
        recipient: 'CLIENT',
        pdfS3Key: 'reports/test/2026/3/CRA_WITH_WEATHER-456.pdf',
        status: 'VALIDATED',
        comment: 'Rapport conforme',
        resolvedBy: 'Jean Dupont',
        resolvedAt: new Date(),
        expiresAt,
      },
    });

    expect(created.status).toBe('VALIDATED');
    expect(created.comment).toBe('Rapport conforme');
    expect(created.resolvedBy).toBe('Jean Dupont');
    expect(created.resolvedAt).not.toBeNull();
    expect(created.reportType).toBe('CRA_WITH_WEATHER');
    expect(created.recipient).toBe('CLIENT');
  });

  // ── Contrainte unique sur token ─────────────────────────────────────────────

  it('enforces @unique constraint on token — duplicate token raises error', async () => {
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);
    const fixedToken = '00000000-0000-0000-0000-000000000001';

    await prisma.reportValidationRequest.create({
      data: {
        employeeId: ctx.employeeId,
        year: 2026,
        month: 3,
        reportType: 'CRA_ONLY',
        recipient: 'ESN',
        pdfS3Key: 'reports/test.pdf',
        token: fixedToken,
        expiresAt,
      },
    });

    await expect(
      prisma.reportValidationRequest.create({
        data: {
          employeeId: ctx.employeeId,
          year: 2026,
          month: 3,
          reportType: 'CRA_ONLY',
          recipient: 'CLIENT',
          pdfS3Key: 'reports/test.pdf',
          token: fixedToken,
          expiresAt,
        },
      }),
    ).rejects.toThrow();
  });

  // ── Contrainte FK sur employeeId ────────────────────────────────────────────

  it('rejects insert when employeeId does not reference a valid User', async () => {
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

    await expect(
      prisma.reportValidationRequest.create({
        data: {
          employeeId: '00000000-0000-0000-0000-nonexistentid',
          year: 2026,
          month: 3,
          reportType: 'CRA_ONLY',
          recipient: 'ESN',
          pdfS3Key: 'reports/test.pdf',
          expiresAt,
        },
      }),
    ).rejects.toThrow();
  });

  // ── Relation User ───────────────────────────────────────────────────────────

  it('loads the employee relation via include', async () => {
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

    await prisma.reportValidationRequest.create({
      data: {
        employeeId: ctx.employeeId,
        year: 2026,
        month: 3,
        reportType: 'CRA_ONLY',
        recipient: 'ESN',
        pdfS3Key: 'reports/test.pdf',
        expiresAt,
      },
    });

    const withEmployee = await prisma.reportValidationRequest.findFirst({
      where: { employeeId: ctx.employeeId },
      include: { employee: { select: { id: true, email: true } } },
    });

    expect(withEmployee).not.toBeNull();
    expect(withEmployee!.employee.id).toBe(ctx.employeeId);
    expect(withEmployee!.employee.email).toBe('e2e-employee@test.com');
  });
});
