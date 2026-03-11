import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChildrenService } from './children.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('children')
export class ChildrenController {
  constructor(private readonly service: ChildrenService) {}

  @Get()
  findAll() {
    return [];
  }
}
