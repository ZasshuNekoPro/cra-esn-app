import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { WeatherService } from './weather.service';
import { CommentsService } from './comments.service';
import { MilestonesService } from './milestones.service';
import { ValidationsService } from './validations.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateWeatherEntryDto } from './dto/weather-entry.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CompleteMilestoneDto } from './dto/complete-milestone.dto';
import { CreateValidationDto } from './dto/create-validation.dto';
import { DecideValidationDto } from './dto/decide-validation.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly weatherService: WeatherService,
    private readonly commentsService: CommentsService,
    private readonly milestonesService: MilestonesService,
    private readonly validationsService: ValidationsService,
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
    @CurrentUser() user: JwtPayload,
    @Query('yearMonth') yearMonth?: string,
  ) {
    return this.weatherService.getHistory(id, user.sub, user.role, yearMonth ? { yearMonth } : {});
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
    @CurrentUser() user: JwtPayload,
  ) {
    return this.weatherService.getMonthlySummary(id, user.sub, user.role, year, month);
  }

  // ── Comments ─────────────────────────────────────────────────────────────

  /**
   * GET /projects/:id/comments
   * List comments filtered by caller's visibility scope.
   */
  @Get(':id/comments')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  getComments(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.commentsService.getComments(id, user.sub, user.role);
  }

  /**
   * POST /projects/:id/comments
   * Add a comment (all roles).
   */
  @Post(':id/comments')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.createComment(id, user.sub, user.role, dto);
  }

  /**
   * PATCH /projects/:id/comments/:commentId
   * Update own comment (content / visibility).
   */
  @Patch(':id/comments/:commentId')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  updateComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.updateComment(commentId, user.sub, dto);
  }

  /**
   * POST /projects/:id/comments/:commentId/resolve
   * Resolve a blocker comment (ESN_ADMIN only).
   */
  @Post(':id/comments/:commentId/resolve')
  @Roles(Role.ESN_ADMIN)
  @HttpCode(HttpStatus.OK)
  resolveBlocker(
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.resolveBlocker(commentId, user.sub);
  }

  // ── Milestones ───────────────────────────────────────────────────────────

  /**
   * GET /projects/:id/milestones
   */
  @Get(':id/milestones')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  getMilestones(@Param('id') id: string) {
    return this.milestonesService.getMilestones(id);
  }

  /**
   * POST /projects/:id/milestones
   */
  @Post(':id/milestones')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  createMilestone(
    @Param('id') id: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.milestonesService.createMilestone(id, user.sub, dto);
  }

  /**
   * PATCH /projects/:id/milestones/:milestoneId
   */
  @Patch(':id/milestones/:milestoneId')
  @Roles(Role.EMPLOYEE)
  updateMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.milestonesService.updateMilestone(milestoneId, user.sub, dto);
  }

  /**
   * POST /projects/:id/milestones/:milestoneId/complete
   */
  @Post(':id/milestones/:milestoneId/complete')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  completeMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: CompleteMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.milestonesService.completeMilestone(milestoneId, user.sub, dto);
  }

  // ── Validations ──────────────────────────────────────────────────────────

  /**
   * GET /projects/:id/validations
   */
  @Get(':id/validations')
  @Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
  getValidations(@Param('id') id: string) {
    return this.validationsService.getValidations(id);
  }

  /**
   * POST /projects/:id/validations
   */
  @Post(':id/validations')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  createValidation(
    @Param('id') id: string,
    @Body() dto: CreateValidationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.validationsService.createValidation(id, user.sub, dto);
  }

  /**
   * POST /projects/:id/validations/:validationId/approve
   */
  @Post(':id/validations/:validationId/approve')
  @Roles(Role.ESN_ADMIN, Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  approveValidation(
    @Param('validationId') validationId: string,
    @Body() dto: DecideValidationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.validationsService.approveValidation(validationId, user.sub, dto);
  }

  /**
   * POST /projects/:id/validations/:validationId/reject
   */
  @Post(':id/validations/:validationId/reject')
  @Roles(Role.ESN_ADMIN, Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  rejectValidation(
    @Param('validationId') validationId: string,
    @Body() dto: DecideValidationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.validationsService.rejectValidation(validationId, user.sub, dto);
  }
}
