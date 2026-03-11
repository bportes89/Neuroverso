import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShortsService } from './shorts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('shorts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shorts')
export class ShortsController {
  constructor(private readonly service: ShortsService) {}

  @Get()
  findAll() {
    return [];
  }
}
