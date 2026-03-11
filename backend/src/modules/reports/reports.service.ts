import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}
}
