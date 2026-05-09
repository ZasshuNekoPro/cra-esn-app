import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';
import { DocumentMetadataService } from './document-metadata.service';
import { UpsertDocumentMetadataDto } from './dto/upsert-document-metadata.dto';

@Controller('documents/:id/metadata')
@Roles(Role.EMPLOYEE)
export class DocumentMetadataController {
  constructor(private readonly service: DocumentMetadataService) {}

  @Get()
  findOne(@Param('id') documentId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findByDocument(documentId, user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  upsert(
    @Param('id') documentId: string,
    @Body() dto: UpsertDocumentMetadataDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsert(documentId, user.sub, dto);
  }

  @Patch()
  update(
    @Param('id') documentId: string,
    @Body() dto: UpsertDocumentMetadataDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsert(documentId, user.sub, dto);
  }
}
