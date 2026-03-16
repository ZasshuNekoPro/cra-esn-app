import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { seedTestData, cleanupTestData, TestContext } from '../helpers/seed.helper';
import { ProjectStatus, WeatherState, CommentVisibility, MilestoneStatus, Role } from '@esn/shared-types';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ctx: TestContext;
  let projectId: string;

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
    // Clean up projects created during tests
    await prisma.project.deleteMany({ where: { missionId: ctx.missionId } });
    await cleanupTestData(prisma);
    await app.close();
  });

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  describe('POST /api/projects', () => {
    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send({ name: 'X', startDate: '2026-01-15', missionId: ctx.missionId })
        .expect(401);
    });

    it('should create a project for the employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({
          name: 'E2E Project Alpha',
          startDate: '2026-01-15',
          missionId: ctx.missionId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E Project Alpha');

      projectId = res.body.id as string;
    });

    it('should reject if mission not owned by caller', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .send({ name: 'X', startDate: '2026-01-15', missionId: ctx.missionId })
        .expect(403);
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects for the employee', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: { id: string }) => p.id === projectId)).toBe(true);
    });

    it('should reject ESN_ADMIN (EMPLOYEE-only route)', async () => {
      await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .expect(403);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project detail for employee', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(res.body.id).toBe(projectId);
      expect(res.body.status).toBe(ProjectStatus.ACTIVE);
      expect(Array.isArray(res.body.weatherHistory)).toBe(true);
      expect(Array.isArray(res.body.milestones)).toBe(true);
      expect(Array.isArray(res.body.pendingValidations)).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app.getHttpServer())
        .get('/api/projects/nonexistent-id')
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(404);
    });
  });

  // ── Weather ───────────────────────────────────────────────────────────────────

  describe('POST /api/projects/:id/weather', () => {
    it('should create a SUNNY weather entry', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/weather`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ state: WeatherState.SUNNY, date: '2026-01-20' })
        .expect(201);

      expect(res.body.state).toBe(WeatherState.SUNNY);
    });

    it('should reject RAINY entry without comment', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/weather`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ state: WeatherState.RAINY, date: '2026-01-21' })
        .expect(400);
    });

    it('should create RAINY entry with comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/weather`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ state: WeatherState.RAINY, date: '2026-01-21', comment: 'Retard livraison' })
        .expect(201);

      expect(res.body.state).toBe(WeatherState.RAINY);
    });
  });

  describe('GET /api/projects/:id/weather', () => {
    it('should return weather history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/weather`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Status transitions ────────────────────────────────────────────────────────

  describe('POST /api/projects/:id/pause + /reopen', () => {
    it('should pause an ACTIVE project', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/pause`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(res.body.status).toBe(ProjectStatus.PAUSED);
    });

    it('should reject pausing a PAUSED project', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/pause`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(409);
    });

    it('should reopen a PAUSED project', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/reopen`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(res.body.status).toBe(ProjectStatus.ACTIVE);
    });
  });

  // ── Milestones ────────────────────────────────────────────────────────────────

  let milestoneId: string;

  describe('POST /api/projects/:id/milestones', () => {
    it('should create a milestone', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/milestones`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ title: 'Livraison v1', dueDate: '2026-04-01' })
        .expect(201);

      expect(res.body.title).toBe('Livraison v1');
      expect(res.body.status).toBe(MilestoneStatus.PLANNED);
      milestoneId = res.body.id as string;
    });
  });

  describe('GET /api/projects/:id/milestones', () => {
    it('should list milestones', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/milestones`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((m: { id: string }) => m.id === milestoneId)).toBe(true);
    });
  });

  describe('POST /api/projects/:id/milestones/:milestoneId/complete', () => {
    it('should complete a milestone', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/milestones/${milestoneId}/complete`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(200);

      expect(res.body.status).toBe(MilestoneStatus.DONE);
    });

    it('should reject completing an already DONE milestone', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/milestones/${milestoneId}/complete`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({})
        .expect(409);
    });
  });

  // ── Comments ──────────────────────────────────────────────────────────────────

  let commentId: string;

  describe('POST /api/projects/:id/comments', () => {
    it('should create a comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/comments`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ content: 'Sprint en bonne voie', visibility: CommentVisibility.ALL })
        .expect(201);

      expect(res.body.content).toBe('Sprint en bonne voie');
      commentId = res.body.id as string;
    });
  });

  describe('GET /api/projects/:id/comments', () => {
    it('should return comments visible to employee', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/comments`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: { id: string }) => c.id === commentId)).toBe(true);
    });
  });

  // ── Validations ───────────────────────────────────────────────────────────────

  let validationId: string;

  describe('POST /api/projects/:id/validations', () => {
    it('should create a validation request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/validations`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({
          title: 'Revue sprint 1',
          description: 'Validation du livrable sprint 1',
          targetRole: Role.ESN_ADMIN,
        })
        .expect(201);

      expect(res.body.title).toBe('Revue sprint 1');
      validationId = res.body.id as string;
    });
  });

  describe('POST /api/projects/:id/validations/:id/approve', () => {
    it('should approve a validation request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/validations/${validationId}/approve`)
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .send({})
        .expect(200);

      expect(res.body.status).toBe('APPROVED');
    });

    it('should reject approving a non-PENDING validation', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/validations/${validationId}/approve`)
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .send({})
        .expect(403);
    });
  });

  // ── Access control ────────────────────────────────────────────────────────────

  describe('Access control', () => {
    it('ESN_ADMIN should access project detail', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${ctx.esnToken}`)
        .expect(200);
    });

    it('CLIENT should access project detail', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${ctx.clientToken}`)
        .expect(200);
    });
  });

  // ── Close project ─────────────────────────────────────────────────────────────

  describe('POST /api/projects/:id/close', () => {
    it('should close a project', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/close`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(200);
    });

    it('should reject closing an already closed project', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/close`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(409);
    });

    it('should not allow weather entry on a closed project', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/weather`)
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .send({ state: WeatherState.SUNNY, date: '2026-02-01' })
        .expect(409);
    });
  });
});
