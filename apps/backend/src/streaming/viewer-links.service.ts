import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ViewerLinksService {
  constructor(private prisma: PrismaService) {}

  async create(input: { appointmentId: string; createdById?: string | null; ttlSeconds: number }) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    const link = await this.prisma.viewerLink.create({
      data: {
        token,
        appointmentId: input.appointmentId,
        createdById: input.createdById ?? null,
        expiresAt
      }
    });
    return { token: link.token, expiresAt: link.expiresAt.toISOString() };
  }

  async validate(token: string) {
    const link = await this.prisma.viewerLink.findUnique({ where: { token } });
    if (!link) throw new NotFoundException("Link inválido");
    if (link.expiresAt.getTime() <= Date.now()) throw new NotFoundException("Link expirado");
    return link;
  }
}

