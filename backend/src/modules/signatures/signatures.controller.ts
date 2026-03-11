import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SignaturesService } from './signatures.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('signatures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('signatures')
export class SignaturesController {
  constructor(private readonly service: SignaturesService) {}

  @Get()
  findAll() {
    return [];
  }
}
