import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { RagQueryService } from './rag-query.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@esn/shared-types';
import type { JwtPayload } from '@esn/shared-types';

@Controller('rag')
@Roles(Role.EMPLOYEE)
export class RagController {
  constructor(private readonly ragQueryService: RagQueryService) {}

  /**
   * POST /rag/stream
   * Returns a Server-Sent Events stream for the RAG query.
   * Each event is one of:
   *   data: {"type":"token","content":"..."}
   *   data: {"type":"sources","sources":[...]}
   *   data: {"type":"done"}
   */
  @Post('stream')
  @HttpCode(HttpStatus.OK)
  async stream(
    @Body() dto: RagQueryDto,
    @Res() res: Response,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.ragQueryService.streamQuery(user.sub, dto)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Internal server error' })}\n\n`);
    } finally {
      res.end();
    }
  }
}
