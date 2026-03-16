import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { seedTestData, cleanupTestData, TestContext } from '../helpers/seed.helper';

describe('CRA Signature Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ctx: TestContext;

  // Each test suite gets a fresh craMonthId to avoid state pollution
  let craMonthId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgresql://esn_user:password@localhost:5433/esn_cra_test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  /**
   * Helper: create a fresh CRA month with one work entry so it can be submitted.
   */
  // Known working days (not weekend, not public holiday) for each test month in 2026
  const SAFE_WORKING_DAYS: Record<number, string> = {
    4: '2026-04-02',  // Thursday
    5: '2026-05-04',  // Monday
    6: '2026-06-02',  // Tuesday
    7: '2026-07-02',  // Thursday
    8: '2026-08-03',  // Monday
    9: '2026-09-02',  // Wednesday
    10: '2026-10-02', // Friday
    11: '2026-11-02', // Monday
  };

  async function createFreshDraftMonth(monthOffset = 0): Promise<string> {
    // Use different months to avoid unique constraint collisions (months 4–11)
    const month = 4 + monthOffset;

    const res = await request(app.getHttpServer())
      .get(`/api/cra/months/2026/${month}`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .expect(200);

    const id = res.body.id as string;

    // Add at least one entry so submission is allowed
    const safeDate = SAFE_WORKING_DAYS[month];
    await request(app.getHttpServer())
      .post(`/api/cra/months/${id}/entries`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .send({ date: safeDate, entryType: 'WORK_ONSITE', dayFraction: 1 });

    return id;
  }

  // ── Full happy path ──────────────────────────────────────────────────────────

  it('full happy path: DRAFT → SUBMITTED → SIGNED_EMPLOYEE → SIGNED_ESN → SIGNED_CLIENT', async () => {
    craMonthId = await createFreshDraftMonth(0);

    // 1. DRAFT → SUBMITTED
    const submitted = await request(app.getHttpServer())
      .post(`/api/cra/months/${craMonthId}/submit`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .send({})
      .expect(200);
    expect(submitted.body.status).toBe('SUBMITTED');

    // 2. SUBMITTED → SIGNED_EMPLOYEE
    const signedEmployee = await request(app.getHttpServer())
      .post(`/api/cra/months/${craMonthId}/sign-employee`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .expect(200);
    expect(signedEmployee.body.status).toBe('SIGNED_EMPLOYEE');

    // 3. SIGNED_EMPLOYEE → SIGNED_ESN
    const signedEsn = await request(app.getHttpServer())
      .post(`/api/cra/months/${craMonthId}/sign-esn`)
      .set('Authorization', `Bearer ${ctx.esnToken}`)
      .expect(200);
    expect(signedEsn.body.status).toBe('SIGNED_ESN');

    // 4. SIGNED_ESN → SIGNED_CLIENT
    const signedClient = await request(app.getHttpServer())
      .post(`/api/cra/months/${craMonthId}/sign-client`)
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .expect(200);
    expect(signedClient.body.status).toBe('SIGNED_CLIENT');
  });

  // ── ESN reject: SIGNED_EMPLOYEE → DRAFT ─────────────────────────────────────

  it('ESN reject: SIGNED_EMPLOYEE → DRAFT with comment', async () => {
    const mId = await createFreshDraftMonth(1);

    // submit
    await request(app.getHttpServer())
      .post(`/api/cra/months/${mId}/submit`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .send({})
      .expect(200);

    // sign as employee
    await request(app.getHttpServer())
      .post(`/api/cra/months/${mId}/sign-employee`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .expect(200);

    // ESN reject
    const rejected = await request(app.getHttpServer())
      .post(`/api/cra/months/${mId}/reject-esn`)
      .set('Authorization', `Bearer ${ctx.esnToken}`)
      .send({ comment: 'Missing entries for week 3' })
      .expect(200);

    expect(rejected.body.status).toBe('DRAFT');
    expect(rejected.body.rejectionComment).toBe('Missing entries for week 3');
  });

  // ── CLIENT reject: SIGNED_ESN → DRAFT ───────────────────────────────────────

  it('CLIENT reject: SIGNED_ESN → DRAFT with comment', async () => {
    const mId = await createFreshDraftMonth(2);

    // Full path to SIGNED_ESN
    await request(app.getHttpServer())
      .post(`/api/cra/months/${mId}/submit`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .send({})
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/cra/months/${mId}/sign-employee`)
      .set('Authorization', `Bearer ${ctx.employeeToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/cra/months/${mId}/sign-esn`)
      .set('Authorization', `Bearer ${ctx.esnToken}`)
      .expect(200);

    // Client reject
    const rejected = await request(app.getHttpServer())
      .post(`/api/cra/months/${mId}/reject-client`)
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ comment: 'Days do not match the project plan' })
      .expect(200);

    expect(rejected.body.status).toBe('DRAFT');
    expect(rejected.body.rejectionComment).toBe('Days do not match the project plan');
  });

  // ── Access control ───────────────────────────────────────────────────────────

  describe('Access control', () => {
    it('should return 401 without JWT on sign-employee', async () => {
      await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/sign-employee`)
        .expect(401);
    });

    it('should return 403 when EMPLOYEE tries sign-esn', async () => {
      // sign-esn requires ESN_ADMIN role
      await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/sign-esn`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(403);
    });

    it('should return 409 when submit called on non-DRAFT month', async () => {
      // craMonthId is already in SIGNED_CLIENT state from the happy path test
      await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/submit`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(409);
    });

    it('should return 400 when reject-esn called with empty comment', async () => {
      const mId = await createFreshDraftMonth(3);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/submit`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/sign-employee`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/reject-esn`)
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .send({ comment: '' })
        .expect(400);
    });
  });

  // ── AuditLog integrity ───────────────────────────────────────────────────────

  describe('AuditLog integrity', () => {
    it('should create AuditLog CRA_SUBMITTED after submit', async () => {
      const mId = await createFreshDraftMonth(4);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/submit`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(200);

      const log = await prisma.auditLog.findFirst({
        where: {
          action: 'CRA_SUBMITTED',
          resource: `cra_month:${mId}`,
        },
      });

      expect(log).not.toBeNull();
      expect(log?.initiatorId).toBe(ctx.employeeId);
    });

    it('should create AuditLog CRA_SIGNED_ESN after ESN sign', async () => {
      const mId = await createFreshDraftMonth(5);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/submit`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/sign-employee`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/sign-esn`)
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .expect(200);

      const log = await prisma.auditLog.findFirst({
        where: {
          action: 'CRA_SIGNED_ESN',
          resource: `cra_month:${mId}`,
        },
      });

      expect(log).not.toBeNull();
      expect(log?.initiatorId).toBe(ctx.esnAdminId);
    });
  });

  // ── Notifications ────────────────────────────────────────────────────────────

  describe('Notifications', () => {
    it('should create in-app notification for ESN_ADMIN after employee sign', async () => {
      const mId = await createFreshDraftMonth(6);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/submit`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/sign-employee`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      const notification = await prisma.notification.findFirst({
        where: {
          userId: ctx.esnAdminId,
          channel: 'IN_APP',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(notification).not.toBeNull();
      expect(notification?.subject).toContain('CRA');
    });

    it('should create in-app notification for EMPLOYEE after ESN rejection', async () => {
      const mId = await createFreshDraftMonth(7);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/submit`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/sign-employee`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/cra/months/${mId}/reject-esn`)
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .send({ comment: 'Please review week 2' })
        .expect(200);

      const notification = await prisma.notification.findFirst({
        where: {
          userId: ctx.employeeId,
          channel: 'IN_APP',
          subject: { contains: 'refusé' },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(notification).not.toBeNull();
    });
  });
});
