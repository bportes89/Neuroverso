import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DeviceMirrorLinksService {
  constructor(private prisma: PrismaService) {}

  async create(input: { appointmentId: string; deviceId: string; createdById: string; role: string; ttlSeconds: number }) {
    const [appointment, device, consent] = await Promise.all([
      this.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: { therapist: { select: { id: true } }, session: true, room: { select: { id: true, name: true } } }
      }),
      this.prisma.device.findUnique({ where: { id: input.deviceId } }),
      this.prisma.mediaConsent.findUnique({ where: { appointmentId: input.appointmentId }, select: { streaming: true } })
    ]);

    if (!appointment) throw new NotFoundException("Agendamento não encontrado");
    if (!device) throw new NotFoundException("Dispositivo não encontrado");
    if (!consent?.streaming) throw new ConflictException("Sem consentimento para streaming");
    if (appointment.session?.status !== "IN_PROGRESS") throw new ConflictException("Sessão precisa estar em andamento");
    if (appointment.therapist.id !== input.createdById && input.role !== "ADMIN" && input.role !== "COORDINATOR") {
      throw new ForbiddenException("Sem permissão para criar link de espelhamento nesta sessão");
    }
    if (device.roomId && device.roomId !== appointment.room.id) {
      throw new ConflictException("Dispositivo precisa estar associado à mesma sala da sessão");
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    const created = await this.prisma.deviceMirrorLink.create({
      data: {
        token,
        appointmentId: input.appointmentId,
        deviceId: input.deviceId,
        createdById: input.createdById,
        expiresAt
      }
    });

    return {
      token: created.token,
      expiresAt: created.expiresAt.toISOString(),
      appointmentId: appointment.id,
      roomName: appointment.room.name,
      deviceName: device.name
    };
  }

  async validate(token: string) {
    const link = await this.prisma.deviceMirrorLink.findUnique({
      where: { token },
      include: {
        device: true,
        appointment: { include: { room: true, session: true, therapist: { select: { id: true, name: true } } } }
      }
    });
    if (!link) throw new NotFoundException("Link inválido");
    if (link.expiresAt.getTime() <= Date.now()) throw new NotFoundException("Link expirado");
    return link;
  }
}
