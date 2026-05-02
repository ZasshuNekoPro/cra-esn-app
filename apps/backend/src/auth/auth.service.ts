import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../notifications/mailer.service';
import type { LoginRequest, LoginResponse, JwtPayload, PublicUser } from '@esn/shared-types';
import { AuditAction } from '@esn/shared-types';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

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
    esnId: string | null;
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
    private readonly mailer: MailerService,
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
      esnId: user.esnId ?? null,
    };

    void this.prisma.auditLog.create({
      data: {
        action: AuditAction.USER_LOGIN,
        resource: `user:${user.id}`,
        initiatorId: user.id,
        metadata: { email: user.email, role: user.role },
      },
    });

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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true },
    });
    if (!user) return; // silent — prevent email enumeration

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    const baseUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3100';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await this.mailer.sendEmail(
      email,
      'Réinitialisation de votre mot de passe',
      `<p>Bonjour ${user.firstName},</p>
      <p>Cliquez sur ce lien pour réinitialiser votre mot de passe (valable 1 heure) :</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const hashed = await bcrypt.hash(newPassword, rounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordResetToken: null, passwordResetExpires: null },
    });
  }
}
