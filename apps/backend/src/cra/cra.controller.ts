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
import { CraService } from './cra.service';
import { CreateCraEntryDto } from './dto/create-cra-entry.dto';
import { UpdateCraEntryDto } from './dto/update-cra-entry.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { CraMonthSummary, JwtPayload } from '@esn/shared-types';

@Controller('cra')
export class CraController {
  constructor(private readonly craService: CraService) {}

  /**
   * GET /cra/months
   * List all CRA months for the authenticated employee.
   */
  @Get('months')
  @Roles(Role.EMPLOYEE)
  async listMonths(@CurrentUser() user: JwtPayload): Promise<object[]> {
    return this.craService.listMonths(user.sub);
  }

  /**
   * GET /cra/months/:year/:month
   * Get or create a DRAFT CraMonth for the given year/month.
   */
  @Get('months/:year/:month')
  @Roles(Role.EMPLOYEE)
  async getOrCreateMonth(
    @Param('year') year: string,
    @Param('month') month: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craService.getOrCreateMonth(user.sub, parseInt(year, 10), parseInt(month, 10));
  }

  /**
   * GET /cra/months/:id/summary
   * Returns computed summary (totals, working days, leave balances, isOvertime).
   */
  @Get('months/:id/summary')
  @Roles(Role.EMPLOYEE)
  async getMonthSummary(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CraMonthSummary> {
    return this.craService.getMonthSummary(id, user.sub);
  }

  /**
   * POST /cra/months/:id/entries
   * Create a new CraEntry.
   */
  @Post('months/:id/entries')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async createEntry(
    @Param('id') id: string,
    @Body() dto: CreateCraEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craService.createEntry(id, dto, user.sub);
  }

  /**
   * PUT /cra/months/:id/entries/:eid
   * Update an existing CraEntry.
   */
  @Put('months/:id/entries/:eid')
  @Roles(Role.EMPLOYEE)
  async updateEntry(
    @Param('id') id: string,
    @Param('eid') eid: string,
    @Body() dto: UpdateCraEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craService.updateEntry(id, eid, dto, user.sub);
  }

  /**
   * DELETE /cra/months/:id/entries/:eid
   * Delete a CraEntry.
   */
  @Delete('months/:id/entries/:eid')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEntry(
    @Param('id') id: string,
    @Param('eid') eid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.craService.deleteEntry(id, eid, user.sub);
  }
}
