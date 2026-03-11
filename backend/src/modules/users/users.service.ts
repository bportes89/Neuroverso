import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, created_at: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }
}
