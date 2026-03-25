import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { PrismaService } from "../prisma/prisma.service";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";
import { type SignedUrlResource } from "@prisma/client";

@Injectable()
export class SignedUrlsService {
  constructor(
    private prisma: PrismaService,
    @Inject(ENV) private env: Env
  ) {}

  async create(input: { resource: SignedUrlResource; resourceId: string; ttlSeconds: number; createdById?: string | null }) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);

    if (input.resource === "SHORT_CLIP") {
      const clip = await this.prisma.shortClip.findUnique({ where: { id: input.resourceId }, select: { appointmentId: true } });
      if (!clip) throw new NotFoundException("Short não encontrado");
      const consent = await this.prisma.mediaConsent.findUnique({ where: { appointmentId: clip.appointmentId }, select: { shorts: true } });
      if (!consent?.shorts) throw new ConflictException("Sem consentimento para shorts");
    }

    const created = await this.prisma.signedUrl.create({
      data: {
        token,
        resource: input.resource,
        resourceId: input.resourceId,
        expiresAt,
        createdById: input.createdById ?? null
      }
    });

    return { token: created.token, expiresAt: created.expiresAt };
  }

  async validate(token: string) {
    const link = await this.prisma.signedUrl.findUnique({ where: { token } });
    if (!link) throw new NotFoundException("Link inválido");
    if (link.expiresAt.getTime() <= Date.now()) throw new NotFoundException("Link expirado");
    return link;
  }

  async getFileFromToken(token: string) {
    const link = await this.validate(token);

    if (link.resource === "REPORT_PDF") {
      const report = await this.prisma.sessionReport.findUnique({ where: { id: link.resourceId } });
      if (!report) throw new NotFoundException("Relatório não encontrado");
      const bytes = await fs.readFile(report.storagePath);
      return { contentType: "application/pdf", fileName: `report-${report.id}.pdf`, bytes };
    }

    if (link.resource === "SIGNED_REPORT_PDF") {
      const sig = await this.prisma.signature.findUnique({ where: { id: link.resourceId } });
      if (!sig || !sig.signedStoragePath) throw new NotFoundException("Documento assinado não encontrado");
      const bytes = await fs.readFile(sig.signedStoragePath);
      return { contentType: "application/pkcs7-signature", fileName: `signature-${sig.id}.p7s`, bytes };
    }

    if (link.resource === "SIGNATURE_EVIDENCE") {
      const sig = await this.prisma.signature.findUnique({ where: { id: link.resourceId } });
      if (!sig || !sig.storagePath) throw new NotFoundException("Evidência não encontrada");
      const bytes = await fs.readFile(sig.storagePath);
      return { contentType: "application/json", fileName: `signature-${sig.id}.json`, bytes };
    }

    if (link.resource === "SHORT_CLIP") {
      const clip = await this.prisma.shortClip.findUnique({ where: { id: link.resourceId } });
      if (!clip) throw new NotFoundException("Short não encontrado");
      const consent = await this.prisma.mediaConsent.findUnique({ where: { appointmentId: clip.appointmentId }, select: { shorts: true } });
      if (!consent?.shorts) throw new NotFoundException("Sem consentimento para shorts");
      const bytes = await fs.readFile(clip.storagePath);
      const ext = this.extFromMime(clip.mimeType);
      return { contentType: clip.mimeType, fileName: `short-${clip.id}${ext}`, bytes };
    }

    throw new NotFoundException("Recurso inválido");
  }

  async cleanupExpired() {
    await this.prisma.signedUrl.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  private extFromMime(mime: string) {
    if (mime.includes("webm")) return ".webm";
    if (mime.includes("mp4")) return ".mp4";
    if (mime.includes("pdf")) return ".pdf";
    if (mime.includes("json")) return ".json";
    return "";
  }
}
