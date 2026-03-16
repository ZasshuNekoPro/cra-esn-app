import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { WeatherService } from './weather.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateWeatherEntryDto } from './dto/weather-entry.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly weatherService: WeatherService,
  ) {}

  /**
   * GET /projects
   * List all projects for the authenticated employee.
   */
  @Get()
  @Roles(Role.EMPLOYEE)
  listProjects(@CurrentUser() user: JwtPayload) {
    return this.projectsService.findAllForEmployee(user.sub);
  }

  /**
   * GET /projects/:id
   * Project detail with weather history, milestones, pending validations.
   */
  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  getProject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.findOne(id, user.sub, user.role);
  }

  /**
   * POST /projects
   * Create a project (EMPLOYEE only, must own the mission).
   */
  @Post()
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: JwtPayload) {
    return this.projectsService.create(user.sub, dto);
  }

  /**
   * PUT /projects/:id
   * Update project metadata (EMPLOYEE, must own the project).
   */
  @Put(':id')
  @Roles(Role.EMPLOYEE)
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.update(id, user.sub, dto);
  }

  /**
   * POST /projects/:id/pause  → ACTIVE → PAUSED
   */
  @Post(':id/pause')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  pauseProject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.pauseProject(id, user.sub);
  }

  /**
   * POST /projects/:id/reopen  → PAUSED → ACTIVE
   */
  @Post(':id/reopen')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  reopenProject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.reopenProject(id, user.sub);
  }

  /**
   * POST /projects/:id/close  → ACTIVE|PAUSED → CLOSED
   */
  @Post(':id/close')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  closeProject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.closeProject(id, user.sub);
  }

  // ── Weather ──────────────────────────────────────────────────────────────

  /**
   * GET /projects/:id/weather
   * Last 30 weather entries (or filtered by month via ?yearMonth=YYYY-MM).
   */
  @Get(':id/weather')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  getWeatherHistory(
    @Param('id') id: string,
    @Query('yearMonth') yearMonth?: string,
  ) {
    return this.weatherService.getHistory(id, yearMonth ? { yearMonth } : {});
  }

  /**
   * POST /projects/:id/weather
   * Create a weather entry (EMPLOYEE only).
   */
  @Post(':id/weather')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  createWeatherEntry(
    @Param('id') id: string,
    @Body() dto: CreateWeatherEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.weatherService.createEntry(id, user.sub, dto);
  }

  /**
   * GET /projects/:id/weather/summary
   * Dominant weather state for given year/month.
   * Query: ?year=2026&month=3
   */
  @Get(':id/weather/summary')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  getWeatherSummary(
    @Param('id') id: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.weatherService.getMonthlySummary(id, year, month);
  }
}
