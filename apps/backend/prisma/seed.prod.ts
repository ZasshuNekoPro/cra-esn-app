import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ ADMIN_PASSWORD must be at least 12 characters');
    process.exit(1);
  }

  const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
  const hashed = await bcrypt.hash(password, rounds);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashed,
      firstName: 'Platform',
      lastName: 'Admin',
      role: Role.PLATFORM_ADMIN,
    },
  });

  console.log(`✅ Platform admin created: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
