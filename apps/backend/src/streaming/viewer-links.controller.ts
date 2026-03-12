import { Body, ConflictException, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles";
import { PrismaService } from "../prisma/prisma.service";
import { ViewerLinksService } from "./viewer-links.service";
import { LivekitService } from "./livekit.service";

const createSchema = z.object({
  appointmentId: z.string().uuid(),
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24).default(60 * 15)
});

@Controller("viewer-links")
export class ViewerLinksController {
  constructor(
    private viewerLinks: ViewerLinksService,
    private livekit: LivekitService,
    private prisma: PrismaService
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "COORDINATOR", "THERAPIST")
  @Post()
  async create(@Req() req: any, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    const createdById = req.user.sub as string;
    return this.viewerLinks.create({ appointmentId: body.appointmentId, createdById, ttlSeconds: body.ttlSeconds });
  }

  @Get(":token")
  async info(@Param("token") token: string) {
    const link = await this.viewerLinks.validate(token);
    return { appointmentId: link.appointmentId, expiresAt: link.expiresAt.toISOString() };
  }

  @Get(":token/livekit-token")
  async livekitToken(@Param("token") token: string) {
    const link = await this.viewerLinks.validate(token);
    const session = await this.prisma.session.findUnique({ where: { appointmentId: link.appointmentId }, select: { status: true } });
    if (!session || session.status !== "IN_PROGRESS") throw new ConflictException("Sessão precisa estar em andamento");
    const roomName = `appointment:${link.appointmentId}`;
    const jwt = this.livekit.createToken({
      identity: `viewer:${token}`,
      roomName,
      ttlSeconds: Math.max(30, Math.floor((link.expiresAt.getTime() - Date.now()) / 1000)),
      grant: { roomJoin: true, canSubscribe: true, canPublish: false }
    });
    return { url: this.livekit.getUrl(), token: jwt, roomName };
  }
}
