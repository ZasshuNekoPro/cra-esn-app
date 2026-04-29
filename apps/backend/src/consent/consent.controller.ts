import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';
import { ConsentService } from './consent.service';
import type { RequestConsentDto } from './dto/request-consent.dto';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  /**
   * ESN_ADMIN requests access to an employee's data.
   * POST /consent/request
   */
  @Post('request')
  @Roles(Role.ESN_ADMIN)
  request(@Body() dto: RequestConsentDto, @CurrentUser() user: JwtPayload) {
    return this.consentService.request(dto, user.sub, user.esnId ?? null);
  }

  /**
   * Employee grants a pending consent.
   * PATCH /consent/:id/grant
   */
  @Patch(':id/grant')
  @Roles(Role.EMPLOYEE)
  grant(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.consentService.grant(id, user.sub);
  }

  /**
   * Employee revokes an active consent.
   * PATCH /consent/:id/revoke
   */
  @Patch(':id/revoke')
  @Roles(Role.EMPLOYEE)
  revoke(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.consentService.revoke(id, user.sub);
  }

  /**
   * Employee lists all consents on their data (pending, granted, revoked).
   * GET /consent/my
   */
  @Get('my')
  @Roles(Role.EMPLOYEE)
  listMine(@CurrentUser() user: JwtPayload) {
    return this.consentService.listForEmployee(user.sub);
  }

  /**
   * ESN_ADMIN lists all consent requests they have sent.
   * GET /consent/sent
   */
  @Get('sent')
  @Roles(Role.ESN_ADMIN)
  listSent(@CurrentUser() user: JwtPayload) {
    return this.consentService.listForRequester(user.sub);
  }
}
