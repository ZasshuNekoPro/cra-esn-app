import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ShareDocumentDto } from './dto/share-document.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';

interface RequestWithIp {
  ip?: string;
  headers: Record<string, string>;
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /** POST /documents/upload — Employee uploads a file */
  @Post('upload')
  @Roles(Role.EMPLOYEE)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.documents.upload(
      dto,
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
      user.sub,
    );
  }

  /** GET /documents — List documents for the authenticated employee */
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() filters: ListDocumentsDto) {
    return this.documents.list(user.sub, filters);
  }

  /** GET /documents/:id — Document detail with versions and shares */
  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.documents.getDetail(id, user.sub, user.role);
  }

  /** GET /documents/:id/download — Presigned/local URL with audit log */
  @Get(':id/download')
  getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: RequestWithIp,
  ) {
    const ip = req.ip ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    return this.documents.getDownloadUrl(id, user.sub, user.role, ip, userAgent);
  }

  /** GET /documents/:id/versions — Version history */
  @Get(':id/versions')
  getVersions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.documents.getVersions(id, user.sub, user.role);
  }

  /** POST /documents/:id/share — Employee shares with a target user */
  @Post(':id/share')
  @Roles(Role.EMPLOYEE)
  share(
    @Param('id') id: string,
    @Body() dto: ShareDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documents.share(id, user.sub, dto.targetUserId);
  }

  /** DELETE /documents/:id/share/:shareId — Revoke a specific share */
  @Delete(':id/share/:shareId')
  @Roles(Role.EMPLOYEE)
  revokeShare(
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documents.revokeShare(id, shareId, user.sub);
  }

  /** DELETE /documents/:id — Soft delete (revoke all shares, delete record) */
  @Delete(':id')
  @Roles(Role.EMPLOYEE)
  softDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.documents.softDelete(id, user.sub);
  }
}
