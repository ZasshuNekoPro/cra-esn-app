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
import { CraSignatureService } from './cra-signature.service';
import { CreateCraEntryDto } from './dto/create-cra-entry.dto';
import { UpdateCraEntryDto } from './dto/update-cra-entry.dto';
import { RejectCraMonthDto } from './dto/reject-cra-month.dto';
import { SignCraMonthDto } from './dto/sign-cra-month.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { CraMonthSummary, JwtPayload } from '@esn/shared-types';

@Controller('cra')
export class CraController {
  constructor(
    private readonly craService: CraService,
    private readonly craSignatureService: CraSignatureService,
  ) {}

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
   * GET /cra/months/:id/summary
   * Returns computed summary (totals, working days, leave balances, isOvertime).
   * MUST be declared before months/:year/:month to avoid Express route ambiguity.
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

  // ── Signature workflow endpoints ──────────────────────────────────────────

  /**
   * POST /cra/months/:id/submit
   * Transition DRAFT → SUBMITTED (employee only, must own the CRA).
   */
  @Post('months/:id/submit')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  async submitMonth(
    @Param('id') id: string,
    @Body() _dto: SignCraMonthDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craSignatureService.submit(id, user.sub);
  }

  /**
   * POST /cra/months/:id/retract
   * Transition SUBMITTED → DRAFT (employee only, must own the CRA).
   */
  @Post('months/:id/retract')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  async retractMonth(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craSignatureService.retract(id, user.sub);
  }

  /**
   * POST /cra/months/:id/sign-employee
   * Transition SUBMITTED → SIGNED_EMPLOYEE (employee only, must own the CRA).
   */
  @Post('months/:id/sign-employee')
  @Roles(Role.EMPLOYEE)
  @HttpCode(HttpStatus.OK)
  async signEmployee(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craSignatureService.signEmployee(id, user.sub);
  }

  /**
   * POST /cra/months/:id/sign-esn
   * Transition SIGNED_EMPLOYEE → SIGNED_ESN (ESN admin only, requires employee consent).
   * The consent is verified manually inside CraSignatureService using the mission's employeeId,
   * since the ConsentGuard expects an employeeId param directly in the URL params.
   * For this endpoint, the consent check is delegated to the service layer.
   */
  @Post('months/:id/sign-esn')
  @Roles(Role.ESN_ADMIN)
  @HttpCode(HttpStatus.OK)
  async signEsn(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craSignatureService.signEsn(id, user.sub);
  }

  /**
   * POST /cra/months/:id/reject-esn
   * Transition SIGNED_EMPLOYEE → DRAFT (ESN admin only, requires employee consent).
   */
  @Post('months/:id/reject-esn')
  @Roles(Role.ESN_ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectEsn(
    @Param('id') id: string,
    @Body() dto: RejectCraMonthDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craSignatureService.rejectEsn(id, user.sub, dto.comment);
  }

  /**
   * POST /cra/months/:id/sign-client
   * Transition SIGNED_ESN → SIGNED_CLIENT (client only, must be the mission's client).
   */
  @Post('months/:id/sign-client')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  async signClient(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craSignatureService.signClient(id, user.sub);
  }

  /**
   * POST /cra/months/:id/reject-client
   * Transition SIGNED_ESN → DRAFT (client only, must be the mission's client).
   */
  @Post('months/:id/reject-client')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  async rejectClient(
    @Param('id') id: string,
    @Body() dto: RejectCraMonthDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<object> {
    return this.craSignatureService.rejectClient(id, user.sub, dto.comment);
  }
}
