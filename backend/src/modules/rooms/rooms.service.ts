import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}
}
