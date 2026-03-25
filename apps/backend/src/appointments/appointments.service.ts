import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

type TimeRange = { startAt: Date; endAt: Date };

function assertValidRange(input: TimeRange) {
  if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime())) throw new ConflictException("startAt inválido");
  if (!(input.endAt instanceof Date) || Number.isNaN(input.endAt.getTime())) throw new ConflictException("endAt inválido");
  if (input.endAt <= input.startAt) throw new ConflictException("endAt deve ser maior que startAt");
}

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService
  ) {}

  async list(input: { from?: Date; to?: Date }) {
    return this.prisma.appointment.findMany({
      where: {
        startAt: input.from && input.to ? { gte: input.from, lte: input.to } : undefined
      },
      orderBy: { startAt: "asc" },
      include: {
        child: true,
        room: true,
        therapist: { select: { id: true, name: true, email: true, role: true } },
        protocol: true,
        session: true
      }
    });
  }

  async create(input: {
    childId: string;
    roomId: string;
    therapistId: string;
    protocolId?: string;
    startAt: Date;
    endAt: Date;
  }) {
    assertValidRange({ startAt: input.startAt, endAt: input.endAt });

    await this.ensureNoConflicts({
      startAt: input.startAt,
      endAt: input.endAt,
      roomId: input.roomId,
      therapistId: input.therapistId
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        childId: input.childId,
        roomId: input.roomId,
        therapistId: input.therapistId,
        protocolId: input.protocolId,
        startAt: input.startAt,
        endAt: input.endAt,
        session: { create: {} }
      },
      include: { therapist: true, child: true, room: true }
    });

    await this.mail.send({
      to: appointment.therapist.email,
      subject: "Neuroverso: sessão agendada",
      text: `Sessão agendada para ${appointment.child.name} em ${appointment.startAt.toISOString()}`
    });

    return appointment;
  }

  async reschedule(input: {
    id: string;
    roomId?: string;
    therapistId?: string;
    protocolId?: string | null;
    startAt?: Date;
    endAt?: Date;
  }) {
    const existing = await this.prisma.appointment.findUnique({
      where: { id: input.id },
      include: { therapist: true, child: true }
    });
    if (!existing) throw new NotFoundException("Agendamento não encontrado");
    if (existing.status !== "SCHEDULED") throw new ConflictException("Agendamento não está ativo");

    const nextStartAt = input.startAt ?? existing.startAt;
    const nextEndAt = input.endAt ?? existing.endAt;
    const nextRoomId = input.roomId ?? existing.roomId;
    const nextTherapistId = input.therapistId ?? existing.therapistId;
    const nextProtocolId = input.protocolId === null ? null : input.protocolId ?? existing.protocolId;

    assertValidRange({ startAt: nextStartAt, endAt: nextEndAt });

    await this.ensureNoConflicts({
      startAt: nextStartAt,
      endAt: nextEndAt,
      roomId: nextRoomId,
      therapistId: nextTherapistId,
      excludeAppointmentId: existing.id
    });

    const updated = await this.prisma.appointment.update({
      where: { id: existing.id },
      data: {
        startAt: nextStartAt,
        endAt: nextEndAt,
        roomId: nextRoomId,
        therapistId: nextTherapistId,
        protocolId: nextProtocolId
      },
      include: { therapist: true, child: true }
    });

    await this.mail.send({
      to: updated.therapist.email,
      subject: "Neuroverso: sessão remarcada",
      text: `Sessão remarcada para ${updated.child.name} em ${updated.startAt.toISOString()}`
    });

    return updated;
  }

  async cancel(input: { id: string; reason?: string }) {
    const existing = await this.prisma.appointment.findUnique({
      where: { id: input.id },
      include: { therapist: true, child: true }
    });
    if (!existing) throw new NotFoundException("Agendamento não encontrado");
    if (existing.status !== "SCHEDULED") return existing;

    const updated = await this.prisma.appointment.update({
      where: { id: existing.id },
      data: { status: "CANCELLED" }
    });

    await this.mail.send({
      to: existing.therapist.email,
      subject: "Neuroverso: sessão cancelada",
      text: `Sessão cancelada para ${existing.child.name} em ${existing.startAt.toISOString()}${input.reason ? ` (${input.reason})` : ""}`
    });

    return updated;
  }

  async getConsent(appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true } });
    if (!appt) throw new NotFoundException("Agendamento não encontrado");
    const consent = await this.prisma.mediaConsent.findUnique({ where: { appointmentId } });
    return {
      appointmentId,
      streaming: consent?.streaming ?? false,
      shorts: consent?.shorts ?? false,
      grantedAt: consent?.grantedAt?.toISOString() ?? null,
      updatedAt: consent?.updatedAt?.toISOString() ?? null,
      grantedById: consent?.grantedById ?? null
    };
  }

  async setConsent(input: { appointmentId: string; streaming?: boolean; shorts?: boolean; grantedById?: string | null }) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: input.appointmentId }, select: { id: true } });
    if (!appt) throw new NotFoundException("Agendamento não encontrado");

    const existing = await this.prisma.mediaConsent.findUnique({ where: { appointmentId: input.appointmentId } });
    const nextStreaming = input.streaming ?? existing?.streaming ?? false;
    const nextShorts = input.shorts ?? existing?.shorts ?? false;

    const saved = await this.prisma.mediaConsent.upsert({
      where: { appointmentId: input.appointmentId },
      create: {
        appointmentId: input.appointmentId,
        streaming: nextStreaming,
        shorts: nextShorts,
        grantedById: input.grantedById ?? null
      },
      update: {
        streaming: nextStreaming,
        shorts: nextShorts,
        grantedById: input.grantedById ?? null
      }
    });

    return {
      appointmentId: saved.appointmentId,
      streaming: saved.streaming,
      shorts: saved.shorts,
      grantedAt: saved.grantedAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
      grantedById: saved.grantedById
    };
  }

  private async ensureNoConflicts(input: {
    startAt: Date;
    endAt: Date;
    roomId: string;
    therapistId: string;
    excludeAppointmentId?: string;
  }) {
    const overlaps = (field: "roomId" | "therapistId") => ({
      status: "SCHEDULED" as const,
      [field]: input[field],
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {})
    });

    const [roomConflict, therapistConflict] = await Promise.all([
      this.prisma.appointment.findFirst({ where: overlaps("roomId"), select: { id: true } }),
      this.prisma.appointment.findFirst({ where: overlaps("therapistId"), select: { id: true } })
    ]);

    if (roomConflict) throw new ConflictException("Conflito de sala no horário");
    if (therapistConflict) throw new ConflictException("Conflito de terapeuta no horário");
  }
}
