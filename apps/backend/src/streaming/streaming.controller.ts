import { ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles";
import { PrismaService } from "../prisma/prisma.service";
import { LivekitService } from "./livekit.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("streaming")
export class StreamingController {
  constructor(
    private prisma: PrismaService,
    private livekit: LivekitService
  ) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST")
  @Get("appointments/:appointmentId/publish-token")
  async publishToken(@Param("appointmentId") appointmentId: string, @Req() req: any) {
    const userId = req.user.sub as string;
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { therapist: { select: { id: true, name: true, email: true } }, session: true }
    });
    if (!appointment) throw new NotFoundException("Agendamento não encontrado");
    if (appointment.session?.status !== "IN_PROGRESS") throw new ConflictException("Sessão precisa estar em andamento");
    if (appointment.therapist.id !== userId && req.user.role !== "ADMIN" && req.user.role !== "COORDINATOR") {
      throw new ForbiddenException("Sem permissão para publicar nesta sessão");
    }

    const roomName = `appointment:${appointment.id}`;
    const jwt = this.livekit.createToken({
      identity: `publisher:${userId}`,
      name: appointment.therapist.name,
      roomName,
      ttlSeconds: 60 * 60,
      grant: { roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true }
    });
    return { url: this.livekit.getUrl(), token: jwt, roomName };
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get("appointments/:appointmentId/subscribe-token")
  async subscribeToken(@Param("appointmentId") appointmentId: string, @Req() req: any) {
    const userId = req.user.sub as string;
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, include: { session: true } });
    if (!appointment) throw new NotFoundException("Agendamento não encontrado");
    if (appointment.session?.status !== "IN_PROGRESS") throw new ConflictException("Sessão precisa estar em andamento");

    const roomName = `appointment:${appointment.id}`;
    const jwt = this.livekit.createToken({
      identity: `staff:${userId}`,
      roomName,
      ttlSeconds: 60 * 30,
      grant: { roomJoin: true, canSubscribe: true, canPublish: false }
    });
    return { url: this.livekit.getUrl(), token: jwt, roomName };
  }
}
