import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConsentsService } from './consents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('consents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consents')
export class ConsentsController {
  constructor(private readonly service: ConsentsService) {}

  @Get()
  findAll() {
    return [];
  }
}
