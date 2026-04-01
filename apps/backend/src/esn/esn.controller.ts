import { Controller, Get, Post, Put, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@esn/shared-types';
import { EsnService } from './esn.service';
import { CreateEsnDto } from './dto/create-esn.dto';
import { UpdateEsnDto } from './dto/update-esn.dto';

@Controller('esn')
export class EsnController {
  constructor(private readonly esnService: EsnService) {}

  /**
   * GET /esn — list all ESN companies (PLATFORM_ADMIN only)
   */
  @Get()
  @Roles(Role.PLATFORM_ADMIN)
  findAll() {
    return this.esnService.findAll();
  }

  /**
   * GET /esn/:id — get one ESN (PLATFORM_ADMIN only)
   */
  @Get(':id')
  @Roles(Role.PLATFORM_ADMIN)
  findOne(@Param('id') id: string) {
    return this.esnService.findOne(id);
  }

  /**
   * POST /esn — create an ESN company (PLATFORM_ADMIN only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.PLATFORM_ADMIN)
  create(@Body() dto: CreateEsnDto) {
    return this.esnService.create(dto);
  }

  /**
   * PUT /esn/:id — update an ESN company (PLATFORM_ADMIN only)
   */
  @Put(':id')
  @Roles(Role.PLATFORM_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateEsnDto) {
    return this.esnService.update(id, dto);
  }

  /**
   * GET /esn/:id/users — list users belonging to an ESN (PLATFORM_ADMIN only)
   */
  @Get(':id/users')
  @Roles(Role.PLATFORM_ADMIN)
  findUsers(@Param('id') id: string) {
    return this.esnService.findUsers(id);
  }
}
