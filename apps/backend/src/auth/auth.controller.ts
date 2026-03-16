import { Controller, Post, Get, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { LoginResponse, JwtPayload } from '@esn/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload): Promise<object> {
    const profile = await this.authService.getProfile(user.sub);

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    return profile;
  }
}
