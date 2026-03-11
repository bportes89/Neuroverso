import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ProtocolsService {
  constructor(private prisma: PrismaService) {}
}
