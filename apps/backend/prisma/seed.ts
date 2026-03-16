import { PrismaClient, Role, CraStatus, WeatherStatus, LeaveType, DocumentType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);

  const employee = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      password: hashedPassword,
      firstName: 'Alice',
      lastName: 'Dupont',
      role: Role.EMPLOYEE,
      phone: '+33 6 12 34 56 78',
    },
  });

  const esnAdmin = await prisma.user.upsert({
    where: { email: 'admin@esn-corp.fr' },
    update: {},
    create: {
      email: 'admin@esn-corp.fr',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Martin',
      role: Role.ESN_ADMIN,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@client-corp.fr' },
    update: {},
    create: {
      email: 'client@client-corp.fr',
      password: hashedPassword,
      firstName: 'Claire',
      lastName: 'Bernard',
      role: Role.CLIENT,
    },
  });

  console.log('  ✓ Users created');

  // ── Mission ────────────────────────────────────────────────────────────────
  const mission = await prisma.mission.upsert({
    where: { id: 'seed-mission-001' },
    update: {},
    create: {
      id: 'seed-mission-001',
      title: 'Développement Plateforme RH',
      description: 'Développement et maintenance de la plateforme RH interne',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      dailyRate: 650,
      isActive: true,
      employeeId: employee.id,
      esnAdminId: esnAdmin.id,
      clientId: client.id,
    },
  });

  console.log('  ✓ Mission created');

  // ── Project ────────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'Module Congés',
      description: 'Implémentation du module de gestion des congés',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      isActive: true,
      missionId: mission.id,
    },
  });

  console.log('  ✓ Project created');

  // ── CRA Month (March 2026 — current month) ─────────────────────────────────
  const craMonth = await prisma.craMonth.upsert({
    where: {
      employeeId_missionId_year_month: {
        employeeId: employee.id,
        missionId: mission.id,
        year: 2026,
        month: 3,
      },
    },
    update: {},
    create: {
      year: 2026,
      month: 3,
      status: CraStatus.DRAFT,
      employeeId: employee.id,
      missionId: mission.id,
    },
  });

  // Sample CRA entries (3 working days)
  for (const day of [3, 4, 5]) {
    await prisma.craEntry.upsert({
      where: {
        craMonthId_date: {
          craMonthId: craMonth.id,
          date: new Date(`2026-03-0${day}`),
        },
      },
      update: {},
      create: {
        craMonthId: craMonth.id,
        date: new Date(`2026-03-0${day}`),
        dayFraction: 1,
      },
    });
  }

  console.log('  ✓ CRA month + entries created');

  // ── Leave Balances ─────────────────────────────────────────────────────────
  await prisma.leaveBalance.upsert({
    where: { userId_year_leaveType: { userId: employee.id, year: 2026, leaveType: LeaveType.PAID_LEAVE } },
    update: {},
    create: { userId: employee.id, year: 2026, leaveType: LeaveType.PAID_LEAVE, totalDays: 25, usedDays: 3 },
  });

  await prisma.leaveBalance.upsert({
    where: { userId_year_leaveType: { userId: employee.id, year: 2026, leaveType: LeaveType.RTT } },
    update: {},
    create: { userId: employee.id, year: 2026, leaveType: LeaveType.RTT, totalDays: 10, usedDays: 0 },
  });

  console.log('  ✓ Leave balances created');

  // ── Weather Entry ──────────────────────────────────────────────────────────
  await prisma.weatherEntry.create({
    data: {
      date: new Date('2026-03-14'),
      status: WeatherStatus.GREEN,
      comment: 'Bonne semaine, avancement nominal',
      projectId: project.id,
      reportedById: employee.id,
    },
  }).catch(() => {}); // ignore duplicate on re-seed

  console.log('  ✓ Weather entry created');

  // ── Consent ────────────────────────────────────────────────────────────────
  await prisma.consent.upsert({
    where: { employeeId_requestedById: { employeeId: employee.id, requestedById: esnAdmin.id } },
    update: {},
    create: {
      employeeId: employee.id,
      requestedById: esnAdmin.id,
      scope: ['cra', 'projects', 'documents'],
      grantedAt: new Date(),
    },
  });

  console.log('  ✓ Consent created');

  // ── Milestone ──────────────────────────────────────────────────────────────
  await prisma.milestone.create({
    data: {
      title: 'Livraison V1 Module Congés',
      description: 'Livraison de la version 1 avec les fonctionnalités de base',
      dueDate: new Date('2026-04-30'),
      projectId: project.id,
      createdById: esnAdmin.id,
    },
  }).catch(() => {});

  console.log('  ✓ Milestone created');

  console.log('\n✅ Seeding complete!');
  console.log('\nTest credentials (password: password123):');
  console.log('  Employee : alice@example.com');
  console.log('  ESN Admin: admin@esn-corp.fr');
  console.log('  Client   : client@client-corp.fr');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
