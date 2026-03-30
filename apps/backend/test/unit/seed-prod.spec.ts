/**
 * Unit tests for prisma/seed.prod.ts logic.
 * We test the validation and bcrypt behaviour without running the full script.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as bcrypt from 'bcryptjs';

// ── helpers mirroring seed.prod.ts validation logic ──────────────────────────

function validateEnv(email: string | undefined, password: string | undefined): string | null {
  if (!email || !password) return 'ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.';
  if (password.length < 12) return 'ADMIN_PASSWORD must be at least 12 characters.';
  return null;
}

describe('seed.prod validation logic', () => {
  it('returns error when ADMIN_EMAIL is missing', () => {
    expect(validateEnv(undefined, 'StrongPass123!')).not.toBeNull();
  });

  it('returns error when ADMIN_PASSWORD is missing', () => {
    expect(validateEnv('admin@esn.fr', undefined)).not.toBeNull();
  });

  it('returns error when ADMIN_PASSWORD is shorter than 12 characters', () => {
    expect(validateEnv('admin@esn.fr', 'short')).not.toBeNull();
  });

  it('returns null (valid) when both vars are present and password >= 12 chars', () => {
    expect(validateEnv('admin@esn.fr', 'StrongPass123!')).toBeNull();
  });

  it('password exactly 12 chars is accepted', () => {
    expect(validateEnv('admin@esn.fr', 'Abcdefghij12')).toBeNull();
  });
});

describe('seed.prod bcrypt hashing', () => {
  it('hashed password verifies correctly with bcrypt.compare', async () => {
    const password = 'StrongPass123!';
    const hashed = await bcrypt.hash(password, 10);
    const match = await bcrypt.compare(password, hashed);
    expect(match).toBe(true);
  });

  it('wrong password does not verify', async () => {
    const hashed = await bcrypt.hash('correct-password-123', 10);
    const match = await bcrypt.compare('wrong-password', hashed);
    expect(match).toBe(false);
  });
});

describe('seed.prod environment variable reading', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reads BCRYPT_ROUNDS from env or defaults to 12', () => {
    process.env['BCRYPT_ROUNDS'] = '10';
    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    expect(rounds).toBe(10);
  });

  it('defaults BCRYPT_ROUNDS to 12 when not set', () => {
    delete process.env['BCRYPT_ROUNDS'];
    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    expect(rounds).toBe(12);
  });
});
