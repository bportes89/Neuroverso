import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class SignaturesService {
  constructor(private prisma: PrismaService) {}
}
