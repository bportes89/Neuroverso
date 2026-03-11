import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GuardiansService } from './guardians.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('guardians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly service: GuardiansService) {}

  @Get()
  findAll() {
    return [];
  }
}
