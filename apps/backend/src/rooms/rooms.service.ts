import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.room.findMany({ orderBy: { name: "asc" } });
  }

  async create(input: { name: string; location?: string }) {
    return this.prisma.room.create({ data: { name: input.name, location: input.location } });
  }

  async update(input: { id: string; name?: string; location?: string }) {
    const existing = await this.prisma.room.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Sala não encontrada");
    return this.prisma.room.update({ where: { id: input.id }, data: { name: input.name, location: input.location } });
  }
}

