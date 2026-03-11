import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProtocolsService } from './protocols.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('protocols')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('protocols')
export class ProtocolsController {
  constructor(private readonly service: ProtocolsService) {}

  @Get()
  findAll() {
    return [];
  }
}
