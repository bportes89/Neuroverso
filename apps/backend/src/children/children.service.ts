import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.child.findMany({ orderBy: { createdAt: "desc" } });
  }

  async create(input: { name: string; birthDate?: string; notes?: string }) {
    return this.prisma.child.create({
      data: {
        name: input.name,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        notes: input.notes
      }
    });
  }

  async update(input: { id: string; name?: string; birthDate?: string; notes?: string }) {
    const existing = await this.prisma.child.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Criança não encontrada");
    return this.prisma.child.update({
      where: { id: input.id },
      data: {
        name: input.name,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        notes: input.notes
      }
    });
  }
}

