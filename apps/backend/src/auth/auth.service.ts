import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import type { LoginRequest, LoginResponse, JwtPayload, PublicUser } from '@esn/shared-types';
import * as bcrypt from 'bcryptjs';

type UserWithoutPassword = Omit<
  {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone: string | null;
    avatarUrl: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    privateNotes: string | null;
  },
  'password' | 'privateNotes'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, privateNotes: _pn, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as JwtPayload['role'],
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: user as unknown as PublicUser,
    };
  }

  async getProfile(userId: string): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, privateNotes: _pn, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
