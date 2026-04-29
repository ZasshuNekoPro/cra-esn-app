import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';
import { ClientCompaniesService } from './client-companies.service';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';

@Controller('client-companies')
export class ClientCompaniesController {
  constructor(private readonly clientCompaniesService: ClientCompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ESN_ADMIN)
  create(@Body() dto: CreateClientCompanyDto, @CurrentUser() user: JwtPayload) {
    if (!user.esnId) throw new ForbiddenException('ESN context required');
    return this.clientCompaniesService.create(dto, user.esnId, user.role);
  }

  @Get()
  @Roles(Role.ESN_ADMIN)
  findAll(@CurrentUser() user: JwtPayload) {
    if (!user.esnId) throw new ForbiddenException('ESN context required');
    return this.clientCompaniesService.findAll(user.esnId);
  }

  @Get(':id')
  @Roles(Role.ESN_ADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    if (!user.esnId) throw new ForbiddenException('ESN context required');
    return this.clientCompaniesService.findOne(id, user.esnId);
  }
}