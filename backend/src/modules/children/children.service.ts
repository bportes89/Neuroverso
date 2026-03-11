import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}
}
