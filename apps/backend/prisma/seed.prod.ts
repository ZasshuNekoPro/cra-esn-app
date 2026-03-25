/**
 * Production seed — creates the initial ESN_ADMIN account.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@esn.fr ADMIN_PASSWORD=StrongPass123! pnpm seed:prod
 *
 * Idempotent: safe to run multiple times — does not overwrite an existing account.
 * Required env vars: ADMIN_EMAIL, ADMIN_PASSWORD (min 12 chars)
 * Optional env var:  BCRYPT_ROUNDS (default: 12)
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
  const hashed = await bcrypt.hash(password, rounds);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {}, // idempotent: do not overwrite an existing account
    create: {
      email,
      password: hashed,
      role: Role.ESN_ADMIN,
      firstName: 'Admin',
      lastName: 'ESN',
    },
  });

  console.log(`✅ ESN_ADMIN account ready: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
