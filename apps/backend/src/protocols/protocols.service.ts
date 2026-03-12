import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProtocolsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.protocol.findMany({ orderBy: { name: "asc" } });
  }

  async create(input: { name: string; description?: string }) {
    return this.prisma.protocol.create({ data: { name: input.name, description: input.description } });
  }

  async update(input: { id: string; name?: string; description?: string | null }) {
    const existing = await this.prisma.protocol.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Protocolo não encontrado");
    return this.prisma.protocol.update({
      where: { id: input.id },
      data: { name: input.name, description: input.description ?? undefined }
    });
  }
}

