import {
  Controller,
  Get,
  Post,
  Put,
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
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  /**
   * POST /missions
   * ESN_ADMIN: creates for any employee
   * EMPLOYEE: creates with self as employee
   * CLIENT: creates with self as client
   */
  @Post()
  @Roles(Role.ESN_ADMIN, Role.EMPLOYEE, Role.CLIENT)
  create(@Body() dto: CreateMissionDto, @CurrentUser() user: JwtPayload) {
    return this.missionsService.create(dto, user.sub, user.role);
  }

  /**
   * GET /missions
   * ESN_ADMIN: all active missions
   * EMPLOYEE: own missions
   * CLIENT: missions where they are client
   */
  @Get()
  @Roles(Role.ESN_ADMIN, Role.EMPLOYEE, Role.CLIENT)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.missionsService.findAll(user.sub, user.role);
  }

  /**
   * GET /missions/:id
   */
  @Get(':id')
  @Roles(Role.ESN_ADMIN, Role.EMPLOYEE, Role.CLIENT)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.missionsService.findOne(id, user.sub, user.role);
  }

  /**
   * PUT /missions/:id — ESN_ADMIN only
   */
  @Put(':id')
  @Roles(Role.ESN_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.missionsService.update(id, dto, user.role);
  }

  /**
   * DELETE /missions/:id — deactivate (ESN_ADMIN only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ESN_ADMIN)
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.missionsService.deactivate(id, user.role);
  }
}
