import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';
import { ClientCompaniesService } from './client-companies.service';
import { CreateClientCompanyDto, CreateContactDto } from './dto/create-client-company.dto';
import { UpdateClientCompanyDto } from './dto/update-client-company.dto';

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

  @Patch(':id')
  @Roles(Role.ESN_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClientCompanyDto, @CurrentUser() user: JwtPayload) {
    if (!user.esnId) throw new ForbiddenException('ESN context required');
    return this.clientCompaniesService.update(id, user.esnId, dto);
  }

  @Post(':id/contacts')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ESN_ADMIN)
  addContact(@Param('id') id: string, @Body() dto: CreateContactDto, @CurrentUser() user: JwtPayload) {
    if (!user.esnId) throw new ForbiddenException('ESN context required');
    return this.clientCompaniesService.addContact(id, user.esnId, dto);
  }
}