import { Controller, Get, Header, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles";
import { ViewerLinksService } from "../streaming/viewer-links.service";
import { ShortsService } from "./shorts.service";

const durationSchema = z.coerce.number().int().positive().max(60_000);

@Controller()
export class ShortsController {
  constructor(
    private shorts: ShortsService,
    private viewerLinks: ViewerLinksService
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get("appointments/:appointmentId/shorts")
  async list(@Param("appointmentId") appointmentId: string) {
    return this.shorts.listByAppointment(appointmentId);
  }

  @Get("viewer-links/:token/shorts")
  async listViewer(@Param("token") token: string) {
    const link = await this.viewerLinks.validate(token);
    return this.shorts.listByAppointment(link.appointmentId);
  }

  @Post("viewer-links/:token/shorts")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }
    })
  )
  async uploadViewer(
    @Param("token") token: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    const link = await this.viewerLinks.validate(token);
    const durationMs = durationSchema.parse(req.body?.durationMs);
    const mimeType = String(file?.mimetype ?? "application/octet-stream");
    const bytes = file?.buffer ? Buffer.from(file.buffer) : Buffer.alloc(0);

    const created = await this.shorts.create({
      appointmentId: link.appointmentId,
      createdById: null,
      mimeType,
      durationMs,
      bytes
    });
    return { id: created.id, sha256: created.sha256, createdAt: created.createdAt.toISOString() };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get("shorts/:id/download")
  @Header("Cache-Control", "no-store")
  async download(@Param("id") id: string, @Res() res: any) {
    const { clip, bytes } = await this.shorts.getFile(id);
    res.setHeader("content-type", clip.mimeType);
    res.setHeader("content-disposition", `inline; filename="${clip.id}.webm"`);
    res.send(bytes);
  }
}

