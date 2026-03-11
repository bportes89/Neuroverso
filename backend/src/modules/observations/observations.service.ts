import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ObservationsService {
  constructor(private prisma: PrismaService) {}
}
