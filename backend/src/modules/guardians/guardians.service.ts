import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class GuardiansService {
  constructor(private prisma: PrismaService) {}
}
