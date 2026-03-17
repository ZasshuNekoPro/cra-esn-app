import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@esn/shared-types';
import { ConsentService } from './consent.service';
import type { RequestConsentDto } from './dto/request-consent.dto';

interface RequestWithUser {
  user: { id: string; role: Role };
}

@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  /**
   * ESN_ADMIN requests access to an employee's data.
   * POST /consent/request
   */
  @Post('request')
  @Roles(Role.ESN_ADMIN)
  request(@Body() dto: RequestConsentDto, @Request() req: RequestWithUser) {
    return this.consentService.request(dto, req.user.id);
  }

  /**
   * Employee grants a pending consent.
   * PATCH /consent/:id/grant
   */
  @Patch(':id/grant')
  @Roles(Role.EMPLOYEE)
  grant(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.consentService.grant(id, req.user.id);
  }

  /**
   * Employee revokes an active consent.
   * PATCH /consent/:id/revoke
   */
  @Patch(':id/revoke')
  @Roles(Role.EMPLOYEE)
  revoke(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.consentService.revoke(id, req.user.id);
  }

  /**
   * Employee lists all consents on their data (pending, granted, revoked).
   * GET /consent/my
   */
  @Get('my')
  @Roles(Role.EMPLOYEE)
  listMine(@Request() req: RequestWithUser) {
    return this.consentService.listForEmployee(req.user.id);
  }

  /**
   * ESN_ADMIN lists all consent requests they have sent.
   * GET /consent/sent
   */
  @Get('sent')
  @Roles(Role.ESN_ADMIN)
  listSent(@Request() req: RequestWithUser) {
    return this.consentService.listForRequester(req.user.id);
  }
}
