import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}
}
