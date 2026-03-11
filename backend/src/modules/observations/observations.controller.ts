import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ObservationsService } from './observations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('observations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('observations')
export class ObservationsController {
  constructor(private readonly service: ObservationsService) {}

  @Get()
  findAll() {
    return [];
  }
}
