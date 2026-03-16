import * as bcrypt from 'bcryptjs';
import { Role, ConsentStatus } from '@esn/shared-types';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/database/prisma.service';
import { loginAs } from './auth.helper';

export interface TestContext {
  employeeId: string;
  esnAdminId: string;
  clientId: string;
  missionId: string;
  employeeToken: string;
  esnToken: string;
  clientToken: string;
}

export async function seedTestData(
  prisma: PrismaService,
  app: INestApplication,
): Promise<TestContext> {
  const hash = await bcrypt.hash('Test1234!', 10);

  // Clean up before seeding — must respect FK dependency order
  await cleanupTestData(prisma);

  const employee = await prisma.user.create({
    data: {
      email: 'e2e-employee@test.com',
      password: hash,
      firstName: 'E2E',
      lastName: 'Employee',
      role: Role.EMPLOYEE,
    },
  });

  const esnAdmin = await prisma.user.create({
    data: {
      email: 'e2e-esn@test.com',
      password: hash,
      firstName: 'E2E',
      lastName: 'ESNAdmin',
      role: Role.ESN_ADMIN,
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'e2e-client@test.com',
      password: hash,
      firstName: 'E2E',
      lastName: 'Client',
      role: Role.CLIENT,
    },
  });

  const mission = await prisma.mission.create({
    data: {
      title: 'E2E Test Mission',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      employeeId: employee.id,
      esnAdminId: esnAdmin.id,
      clientId: client.id,
    },
  });

  // Create consent for ESN admin to access employee data
  await prisma.consent.create({
    data: {
      employeeId: employee.id,
      requestedById: esnAdmin.id,
      status: ConsentStatus.GRANTED,
      scope: ['cra', 'projects', 'documents'],
      grantedAt: new Date(),
    },
  });

  // Get tokens via HTTP login
  const employeeToken = await loginAs(app, 'e2e-employee@test.com', 'Test1234!');
  const esnToken = await loginAs(app, 'e2e-esn@test.com', 'Test1234!');
  const clientToken = await loginAs(app, 'e2e-client@test.com', 'Test1234!');

  return {
    employeeId: employee.id,
    esnAdminId: esnAdmin.id,
    clientId: client.id,
    missionId: mission.id,
    employeeToken,
    esnToken,
    clientToken,
  };
}

const E2E_EMAILS = ['e2e-employee@test.com', 'e2e-esn@test.com', 'e2e-client@test.com'];

export async function cleanupTestData(prisma: PrismaService): Promise<void> {
  // Resolve user IDs first
  const users = await prisma.user.findMany({
    where: { email: { in: E2E_EMAILS } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  // Delete in FK dependency order (children before parents)
  await prisma.validationRequest.deleteMany({
    where: { craMonth: { mission: { title: 'E2E Test Mission' } } },
  });
  await prisma.craMonth.deleteMany({
    where: { mission: { title: 'E2E Test Mission' } },
  });
  await prisma.mission.deleteMany({ where: { title: 'E2E Test Mission' } });
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { initiatorId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  }
  await prisma.consent.deleteMany({
    where: { employee: { email: { in: E2E_EMAILS } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: E2E_EMAILS } },
  });
}
