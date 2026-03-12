import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.device.findMany({ orderBy: { createdAt: "desc" } });
  }

  async create(input: { name: string; kind: string; serial?: string; roomId?: string }) {
    return this.prisma.device.create({
      data: { name: input.name, kind: input.kind, serial: input.serial, roomId: input.roomId }
    });
  }

  async update(input: { id: string; name?: string; kind?: string; serial?: string | null; roomId?: string | null }) {
    const existing = await this.prisma.device.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Dispositivo não encontrado");
    return this.prisma.device.update({
      where: { id: input.id },
      data: {
        name: input.name,
        kind: input.kind,
        serial: input.serial ?? undefined,
        roomId: input.roomId ?? undefined
      }
    });
  }
}

