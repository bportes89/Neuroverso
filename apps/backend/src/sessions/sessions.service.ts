import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async getByAppointment(appointmentId: string) {
    const session = await this.prisma.session.findUnique({
      where: { appointmentId },
      include: {
        notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, email: true } } } },
        appointment: { include: { child: true, room: true, therapist: { select: { id: true, name: true, email: true } }, protocol: true } }
      }
    });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    return session;
  }

  async start(appointmentId: string) {
    const session = await this.prisma.session.findUnique({ where: { appointmentId } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.status === "FINISHED") throw new ConflictException("Sessão já finalizada");
    if (session.status === "IN_PROGRESS") return session;
    return this.prisma.session.update({
      where: { appointmentId },
      data: { status: "IN_PROGRESS", startedAt: new Date() }
    });
  }

  async end(appointmentId: string) {
    const session = await this.prisma.session.findUnique({ where: { appointmentId } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.status === "FINISHED") return session;
    if (session.status === "NOT_STARTED") throw new ConflictException("Sessão não iniciada");
    return this.prisma.session.update({
      where: { appointmentId },
      data: { status: "FINISHED", endedAt: new Date() }
    });
  }

  async addNote(input: { appointmentId: string; authorId: string; text: string }) {
    const session = await this.prisma.session.findUnique({ where: { appointmentId: input.appointmentId } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    return this.prisma.sessionNote.create({
      data: {
        sessionId: session.id,
        authorId: input.authorId,
        text: input.text
      }
    });
  }
}

