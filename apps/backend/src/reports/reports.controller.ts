import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@esn/shared-types';
import { ReportsService } from './reports.service';
import { ReportsSendService } from './reports-send.service';
import { CreateDashboardShareDto } from './dto/create-dashboard-share.dto';
import { SendReportDto } from './dto/send-report.dto';
import type { JwtPayload } from '@esn/shared-types';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsSendService: ReportsSendService,
  ) {}

  // ── Monthly report ─────────────────────────────────────────────────────────

  @Get('monthly/:year/:month')
  @Roles(Role.EMPLOYEE)
  getMonthlyReport(
    @CurrentUser() user: JwtPayload,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.reportsService.getMonthlyReport(user.sub, year, month);
  }

  @Post('monthly/:year/:month/send')
  @Roles(Role.EMPLOYEE)
  sendMonthlyReport(
    @CurrentUser() user: JwtPayload,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body() dto: SendReportDto,
  ) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    if (year < 2020 || year > 2100) {
      throw new BadRequestException('year must be between 2020 and 2100');
    }
    dto.year = year;
    dto.month = month;
    return this.reportsSendService.sendMonthlyReport(dto, user.sub);
  }

  // ── Project presentation ───────────────────────────────────────────────────

  @Get('projects/:projectId')
  @Roles(Role.EMPLOYEE)
  getProjectPresentation(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getProjectPresentation(projectId, user.sub, from, to);
  }

  // ── Dashboard share ────────────────────────────────────────────────────────

  @Post('dashboard-share')
  @Roles(Role.EMPLOYEE)
  createDashboardShare(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDashboardShareDto,
  ) {
    return this.reportsService.createDashboardShare(user.sub, dto.ttlHours);
  }

  @Delete('dashboard-share/:token')
  @Roles(Role.EMPLOYEE)
  revokeDashboardShare(
    @CurrentUser() user: JwtPayload,
    @Param('token') token: string,
  ) {
    return this.reportsService.revokeDashboardShare(token, user.sub);
  }

  // ── Public view (no auth) ──────────────────────────────────────────────────

  @Get('shared/:token')
  @Public()
  getPublicDashboard(@Param('token') token: string) {
    return this.reportsService.getPublicDashboard(token);
  }
}
