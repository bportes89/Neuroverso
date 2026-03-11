import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ConsentsService {
  constructor(private prisma: PrismaService) {}
}
