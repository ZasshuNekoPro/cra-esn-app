import {
  Controller,
  Get,
  Post,
  Patch,
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
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateEsnReferentDto } from './dto/update-esn-referent.dto';
import { UpdateEsnAdminFlagsDto } from './dto/update-esn-admin-flags.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PATCH /users/me — update own profile (all authenticated roles)
   */
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  /**
   * POST /users/me/change-password — change own password (all authenticated roles)
   */
  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.sub, dto);
  }

  /**
   * POST /users
   * PLATFORM_ADMIN → creates ESN_ADMIN
   * ESN_ADMIN → creates EMPLOYEE or CLIENT (scoped to their ESN)
   */
  @Post()
  @Roles(Role.PLATFORM_ADMIN, Role.ESN_ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, user.role, user.esnId ?? null);
  }

  /**
   * GET /users
   * PLATFORM_ADMIN → all users
   * ESN_ADMIN → employees + clients in their ESN
   */
  @Get()
  @Roles(Role.PLATFORM_ADMIN, Role.ESN_ADMIN)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.role, user.esnId ?? null);
  }

  /**
   * GET /users/esn-admins — list ESN_ADMIN users in the caller's ESN (for referent picker)
   */
  @Get('esn-admins')
  @Roles(Role.ESN_ADMIN, Role.PLATFORM_ADMIN)
  listEsnAdmins(@CurrentUser() user: JwtPayload) {
    return this.usersService.listEsnAdmins(user.esnId ?? null);
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
   * PATCH /users/:id — update employee/client profile (ESN_ADMIN)
   */
  @Patch(':id')
  @Roles(Role.ESN_ADMIN, Role.PLATFORM_ADMIN)
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateUser(id, dto, user.role, user.esnId ?? null);
  }

  /**
   * PATCH /users/:id/esn-referent — set the referent ESN admin for an employee (ESN_ADMIN)
   */
  @Patch(':id/esn-referent')
  @Roles(Role.ESN_ADMIN, Role.PLATFORM_ADMIN)
  setEsnReferent(
    @Param('id') id: string,
    @Body() dto: UpdateEsnReferentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.setEsnReferent(id, dto.esnReferentId, user.role, user.esnId ?? null);
  }

  /**
   * PATCH /users/:id/esn-admin-flags — grant/revoke vacation-coverage access to an ESN_ADMIN (ESN_ADMIN)
   */
  @Patch(':id/esn-admin-flags')
  @Roles(Role.ESN_ADMIN, Role.PLATFORM_ADMIN)
  setEsnAdminFlags(
    @Param('id') id: string,
    @Body() dto: UpdateEsnAdminFlagsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.setCanSeeAllReports(id, dto.canSeeAllEsnReports, user.role, user.esnId ?? null);
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
