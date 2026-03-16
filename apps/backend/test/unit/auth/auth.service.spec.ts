import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { Role } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { JwtService } from '@nestjs/jwt';

// Mock bcryptjs so we control compare() return value
vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  password: '$2a$10$hashedpassword',
  firstName: 'Alice',
  lastName: 'Dupont',
  role: Role.EMPLOYEE,
  phone: null,
  avatarUrl: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  privateNotes: null,
};

const makePrisma = (user: typeof mockUser | null = mockUser) => ({
  user: {
    findUnique: vi.fn().mockResolvedValue(user),
    create: vi.fn().mockResolvedValue(mockUser),
  },
} as unknown as PrismaService);

const makeJwt = () => ({
  sign: vi.fn().mockReturnValue('mock.jwt.token'),
} as unknown as JwtService);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeEach(() => {
    prisma = makePrisma();
    jwt = makeJwt();
    service = new AuthService(prisma, jwt);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('returns user without password when credentials are valid', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      const result = await service.validateUser('alice@example.com', 'password123');
      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result?.email).toBe('alice@example.com');
    });

    it('returns null when user is not found', async () => {
      prisma = makePrisma(null);
      service = new AuthService(prisma, jwt);
      const result = await service.validateUser('unknown@example.com', 'pass');
      expect(result).toBeNull();
    });

    it('returns null when password does not match', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      const result = await service.validateUser('alice@example.com', 'wrongpass');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('returns accessToken and user on successful login', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      const result = await service.login({ email: 'alice@example.com', password: 'password123' });
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.email).toBe('alice@example.com');
      expect(result.user).not.toHaveProperty('password');
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('returns user profile by id', async () => {
      const result = await service.getProfile('user-uuid-1');
      expect(result?.email).toBe('alice@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('returns null when user does not exist', async () => {
      prisma = makePrisma(null);
      service = new AuthService(prisma, jwt);
      const result = await service.getProfile('nonexistent-id');
      expect(result).toBeNull();
    });
  });
});
