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
   * ESN_ADMIN / ESN_MANAGER: creates for any employee in their ESN
   * EMPLOYEE: creates with self as employee
   * CLIENT: creates with self as client
   */
  @Post()
  @Roles(Role.ESN_ADMIN, Role.ESN_MANAGER, Role.EMPLOYEE, Role.CLIENT)
  create(@Body() dto: CreateMissionDto, @CurrentUser() user: JwtPayload) {
    return this.missionsService.create(dto, user.sub, user.role, user.esnId ?? null);
  }

  /**
   * GET /missions
   * ESN_ADMIN / ESN_MANAGER: active missions in their ESN
   * EMPLOYEE: own missions
   * CLIENT: missions where they are client
   */
  @Get()
  @Roles(Role.ESN_ADMIN, Role.ESN_MANAGER, Role.EMPLOYEE, Role.CLIENT)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.missionsService.findAll(user.sub, user.role, user.esnId ?? null);
  }

  /**
   * GET /missions/:id
   */
  @Get(':id')
  @Roles(Role.ESN_ADMIN, Role.ESN_MANAGER, Role.EMPLOYEE, Role.CLIENT)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.missionsService.findOne(id, user.sub, user.role);
  }

  /**
   * PUT /missions/:id — ESN_ADMIN / ESN_MANAGER
   */
  @Put(':id')
  @Roles(Role.ESN_ADMIN, Role.ESN_MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.missionsService.update(id, dto, user.role);
  }

  /**
   * DELETE /missions/:id — deactivate (ESN_ADMIN / ESN_MANAGER)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ESN_ADMIN, Role.ESN_MANAGER)
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.missionsService.deactivate(id, user.role);
  }
}
