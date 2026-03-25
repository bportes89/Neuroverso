import { Controller, Get, Post, UseGuards, Inject } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { SignedUrlsService } from "./signed-urls/signed-urls.service";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { Roles } from "./auth/roles";
import { ENV } from "./config/env.token";
import { type Env } from "./config/env";

@Controller()
export class AppController {
  constructor(
    private prisma: PrismaService,
    private signedUrls: SignedUrlsService,
    @Inject(ENV) private env: Env
  ) {}
  @Get("health")
  health() {
    return { ok: true };
  }

  @Get("metrics")
  async metrics() {
    const [pending, signed, declined, expired, failed, signedUrls] = await Promise.all([
      this.prisma.signature.count({ where: { status: "PENDING" } }),
      this.prisma.signature.count({ where: { status: "SIGNED" } }),
      this.prisma.signature.count({ where: { status: "DECLINED" } }),
      this.prisma.signature.count({ where: { status: "EXPIRED" } }),
      this.prisma.signature.count({ where: { status: "FAILED" } }),
      this.prisma.signedUrl.count({ where: { expiresAt: { gt: new Date() } } })
    ]);
    return { signatures: { pending, signed, declined, expired, failed }, signedUrlsActive: signedUrls };
  }

  @Post("admin/retention/cleanup")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "COORDINATOR")
  async cleanup() {
    await this.signedUrls.cleanupExpired();
    const cutoff = new Date(Date.now() - this.env.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.auditEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { ok: true };
  }
}
