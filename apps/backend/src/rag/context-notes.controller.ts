import { Controller, Get, Delete, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';
import { ContextNotesService } from './context-notes.service';

@Controller('context-notes')
@Roles(Role.EMPLOYEE)
export class ContextNotesController {
  constructor(private readonly service: ContextNotesService) {}

  /**
   * GET /context-notes?missionId=&page=&pageSize=
   * Returns paginated context notes for the authenticated employee on a given mission.
   * Always filtered by employeeId — notes are private to the employee who created them.
   */
  @Get()
  list(
    @Query('missionId') missionId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.listByMission({
      missionId,
      employeeId: user.sub,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  /**
   * DELETE /context-notes/:id
   * Hard delete — caller must be the note owner.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.delete(id, user.sub);
  }
}
