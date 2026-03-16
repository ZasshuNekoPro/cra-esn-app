import { PrismaClient, Role, CraStatus, WeatherStatus, LeaveType, DocumentType, CraEntryType } from '@prisma/client';
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
        entryType: CraEntryType.WORK_ONSITE,
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

  // ── Public Holidays France 2024-2027 ──────────────────────────────────────
  // Fixed dates: 1 Jan, 1 May, 8 May, 14 Jul, 15 Aug, 1 Nov, 11 Nov, 25 Dec
  // Variable dates: Easter Monday, Ascension (39d after Easter), Whit Monday (49d after Easter)
  // Easter dates (Sunday): 2024: Mar 31, 2025: Apr 20, 2026: Apr 5, 2027: Apr 28
  const easterSundays: Record<number, Date> = {
    2024: new Date('2024-03-31'),
    2025: new Date('2025-04-20'),
    2026: new Date('2026-04-06'),
    2027: new Date('2027-03-28'),
  };

  const publicHolidays: Array<{ date: Date; name: string; country: string }> = [];

  for (const year of [2024, 2025, 2026, 2027]) {
    const easter = easterSundays[year];

    const easterMonday = new Date(easter);
    easterMonday.setDate(easterMonday.getDate() + 1);

    const ascension = new Date(easter);
    ascension.setDate(ascension.getDate() + 39);

    const whitMonday = new Date(easter);
    whitMonday.setDate(whitMonday.getDate() + 50);

    publicHolidays.push(
      { date: new Date(`${year}-01-01`), name: 'Jour de l\'An', country: 'FR' },
      { date: easterMonday, name: 'Lundi de Pâques', country: 'FR' },
      { date: new Date(`${year}-05-01`), name: 'Fête du Travail', country: 'FR' },
      { date: new Date(`${year}-05-08`), name: 'Victoire 1945', country: 'FR' },
      { date: ascension, name: 'Ascension', country: 'FR' },
      { date: whitMonday, name: 'Lundi de Pentecôte', country: 'FR' },
      { date: new Date(`${year}-07-14`), name: 'Fête Nationale', country: 'FR' },
      { date: new Date(`${year}-08-15`), name: 'Assomption', country: 'FR' },
      { date: new Date(`${year}-11-01`), name: 'Toussaint', country: 'FR' },
      { date: new Date(`${year}-11-11`), name: 'Armistice', country: 'FR' },
      { date: new Date(`${year}-12-25`), name: 'Noël', country: 'FR' },
    );
  }

  for (const holiday of publicHolidays) {
    await prisma.publicHoliday.upsert({
      where: { date_country: { date: holiday.date, country: holiday.country } },
      update: {},
      create: holiday,
    });
  }

  console.log(`  ✓ Public holidays created (${publicHolidays.length} entries for FR 2024-2027)`);

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
