import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /users
   * PLATFORM_ADMIN → creates ESN_ADMIN
   * ESN_ADMIN       → creates EMPLOYEE or CLIENT
   */
  @Post()
  @Roles(Role.PLATFORM_ADMIN, Role.ESN_ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, user.role);
  }

  /**
   * GET /users
   * PLATFORM_ADMIN → all users
   * ESN_ADMIN       → employees + clients only
   */
  @Get()
  @Roles(Role.PLATFORM_ADMIN, Role.ESN_ADMIN)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.role);
  }

  /**
   * GET /users/:id
   */
  @Get(':id')
  @Roles(Role.PLATFORM_ADMIN, Role.ESN_ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * DELETE /users/:id — soft delete (PLATFORM_ADMIN only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.PLATFORM_ADMIN)
  softDelete(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }
}
