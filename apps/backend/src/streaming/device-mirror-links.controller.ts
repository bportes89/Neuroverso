import { Body, ConflictException, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PrismaService } from "../prisma/prisma.service";
import { DeviceMirrorLinksService } from "./device-mirror-links.service";
import { LivekitService } from "./livekit.service";

const createSchema = z.object({
  appointmentId: z.string().uuid(),
  deviceId: z.string().uuid(),
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24).default(60 * 30)
});

@Controller("device-mirror-links")
export class DeviceMirrorLinksController {
  constructor(
    private links: DeviceMirrorLinksService,
    private prisma: PrismaService,
    private livekit: LivekitService
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "COORDINATOR", "THERAPIST")
  @Post()
  async create(@Req() req: any, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.links.create({
      appointmentId: body.appointmentId,
      deviceId: body.deviceId,
      ttlSeconds: body.ttlSeconds,
      createdById: String(req.user.sub),
      role: String(req.user.role)
    });
  }

  @Get(":token")
  async info(@Param("token") token: string) {
    const link = await this.links.validate(token);
    const consent = await this.prisma.mediaConsent.findUnique({
      where: { appointmentId: link.appointmentId },
      select: { streaming: true }
    });
    if (!consent?.streaming) throw new ConflictException("Sem consentimento para streaming");

    return {
      appointmentId: link.appointmentId,
      deviceId: link.deviceId,
      deviceName: link.device.name,
      roomName: link.appointment.room.name,
      therapistName: link.appointment.therapist.name,
      sessionStatus: link.appointment.session?.status ?? "NOT_STARTED",
      expiresAt: link.expiresAt.toISOString()
    };
  }

  @Get(":token/livekit-token")
  async livekitToken(@Param("token") token: string) {
    const link = await this.links.validate(token);
    const consent = await this.prisma.mediaConsent.findUnique({
      where: { appointmentId: link.appointmentId },
      select: { streaming: true }
    });
    if (!consent?.streaming) throw new ConflictException("Sem consentimento para streaming");
    if (link.appointment.session?.status !== "IN_PROGRESS") throw new ConflictException("Sessão precisa estar em andamento");

    const roomName = `appointment:${link.appointmentId}`;
    const jwt = await this.livekit.createToken({
      identity: `device:${link.deviceId}:${token.slice(0, 8)}`,
      name: link.device.name,
      roomName,
      ttlSeconds: Math.max(30, Math.floor((link.expiresAt.getTime() - Date.now()) / 1000)),
      grant: { roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true }
    });
    return { url: this.livekit.getUrl(), token: jwt, roomName };
  }
}
