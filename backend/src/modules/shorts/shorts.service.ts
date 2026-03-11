import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ShortsService {
  constructor(private prisma: PrismaService) {}
}
