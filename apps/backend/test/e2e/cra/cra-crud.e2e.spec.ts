import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { seedTestData, cleanupTestData, TestContext } from '../helpers/seed.helper';

describe('CRA CRUD (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ctx: TestContext;
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

  // ── GET /api/cra/months/:year/:month ────────────────────────────────────────

  describe('GET /api/cra/months/:year/:month', () => {
    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/cra/months/2026/3')
        .expect(401);
    });

    it('should create a DRAFT month if none exists', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cra/months/2026/3')
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.year).toBe(2026);
      expect(res.body.month).toBe(3);

      craMonthId = res.body.id as string;
    });

    it('should return existing month without creating duplicate', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cra/months/2026/3')
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(res.body.id).toBe(craMonthId);

      // Verify there is still only one month in DB
      const count = await prisma.craMonth.count({
        where: { employeeId: ctx.employeeId, year: 2026, month: 3 },
      });
      expect(count).toBe(1);
    });
  });

  // ── POST /api/cra/months/:id/entries ────────────────────────────────────────

  describe('POST /api/cra/months/:id/entries', () => {
    let createdEntryId: string;

    it('should create a WORK_ONSITE entry', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/entries`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({
          date: '2026-03-02',
          entryType: 'WORK_ONSITE',
          dayFraction: 1,
        })
        .expect(201);

      expect(res.body).toHaveProperty('entry');
      expect(res.body.entry.entryType).toBe('WORK_ONSITE');
      expect(res.body).toHaveProperty('isOvertime');

      createdEntryId = res.body.entry.id as string;
    });

    it('should return 409 if entry already exists for that date', async () => {
      await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/entries`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({
          date: '2026-03-02',
          entryType: 'WORK_REMOTE',
          dayFraction: 1,
        })
        .expect(409);
    });

    it('should return 400 if date is a weekend', async () => {
      // 2026-03-01 is a Sunday
      await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/entries`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({
          date: '2026-03-01',
          entryType: 'WORK_ONSITE',
          dayFraction: 1,
        })
        .expect(400);
    });

    it('should return 404 if EMPLOYEE accesses another employee CRA month', async () => {
      // Create another employee and try to add an entry to their CRA
      const otherCraMonthId = 'non-existent-month-id';
      await request(app.getHttpServer())
        .post(`/api/cra/months/${otherCraMonthId}/entries`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({
          date: '2026-03-03',
          entryType: 'WORK_ONSITE',
          dayFraction: 1,
        })
        .expect(404);
    });

    // ── PUT /api/cra/months/:id/entries/:eid ──────────────────────────────────

    describe('PUT /api/cra/months/:id/entries/:eid', () => {
      it('should update entry type', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/cra/months/${craMonthId}/entries/${createdEntryId}`)
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .send({ entryType: 'WORK_REMOTE' })
          .expect(200);

        expect(res.body.entry.entryType).toBe('WORK_REMOTE');
      });

      it('should return 404 if entry not found', async () => {
        await request(app.getHttpServer())
          .put(`/api/cra/months/${craMonthId}/entries/non-existent-id`)
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .send({ entryType: 'WORK_ONSITE' })
          .expect(404);
      });
    });

    // ── DELETE /api/cra/months/:id/entries/:eid ───────────────────────────────

    describe('DELETE /api/cra/months/:id/entries/:eid', () => {
      it('should delete entry', async () => {
        await request(app.getHttpServer())
          .delete(`/api/cra/months/${craMonthId}/entries/${createdEntryId}`)
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .expect(204);

        // Verify entry is gone
        const count = await prisma.craEntry.count({
          where: { id: createdEntryId },
        });
        expect(count).toBe(0);
      });
    });
  });

  // ── GET /api/cra/months/:id/summary ─────────────────────────────────────────

  describe('GET /api/cra/months/:id/summary', () => {
    it('should return correct totalWorkDays', async () => {
      // Add a couple of work entries first
      await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/entries`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ date: '2026-03-04', entryType: 'WORK_ONSITE', dayFraction: 1 });

      await request(app.getHttpServer())
        .post(`/api/cra/months/${craMonthId}/entries`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ date: '2026-03-05', entryType: 'WORK_REMOTE', dayFraction: 1 });

      const res = await request(app.getHttpServer())
        .get(`/api/cra/months/${craMonthId}/summary`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('craMonthId', craMonthId);
      expect(res.body).toHaveProperty('totalWorkDays');
      expect(res.body.totalWorkDays).toBeGreaterThanOrEqual(2);
      expect(res.body).toHaveProperty('workingDaysInMonth');
      expect(res.body).toHaveProperty('isOvertime');
    });
  });
});
