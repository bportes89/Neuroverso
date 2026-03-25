import { Body, Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles";
import { SignaturesService } from "./signatures.service";

const createSchema = z.object({
  provider: z.string().default("MOCK"),
  signerName: z.string().optional(),
  signerDocument: z.string().optional()
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("signatures")
export class SignaturesController {
  constructor(private signatures: SignaturesService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get()
  async list(@Query("status") status?: string, @Query("limit") limit?: string, @Query("cursor") cursor?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const parsedStatus =
      status && ["PENDING", "SIGNED", "DECLINED", "EXPIRED", "FAILED"].includes(status.toUpperCase())
        ? (status.toUpperCase() as any)
        : undefined;
    return this.signatures.list({ status: parsedStatus, limit: parsedLimit, cursor });
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get("reports/:reportId")
  async listByReport(@Param("reportId") reportId: string) {
    return this.signatures.listByReport(reportId);
  }

  @Roles("ADMIN", "COORDINATOR")
  @Post("reports/:reportId")
  async createForReport(
    @Param("reportId") reportId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @Req() req: any
  ) {
    return this.signatures.createForReport({
      reportId,
      provider: body.provider,
      signerName: body.signerName ?? req.user?.name ?? undefined,
      signerDocument: body.signerDocument
    });
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST")
  @Post("reports/:reportId/start-govbr")
  async startGovbr(@Param("reportId") reportId: string, @Req() req: any) {
    const requestedById = req.user?.sub ? String(req.user.sub) : null;
    return this.signatures.startGovbr({ reportId, requestedById, scopes: ["sign", "govbr"] });
  }

  @Get("govbr/callback")
  async govbrCallback(@Query("state") state: string, @Query("code") code?: string, @Query("error") error?: string) {
    const result = await this.signatures.handleGovbrCallback({ state, code, error });
    return { ok: true, ...result };
  }

  @Post("webhooks/govbr")
  async govbrWebhook(@Body() body: any) {
    const state = String(body?.state ?? "");
    const status = String(body?.status ?? "");
    if (!state) return { ok: true };
    const normalized = status.toLowerCase();
    if (normalized === "signed") {
      const res = await this.signatures.handleGovbrCallback({ state, code: undefined, error: undefined });
      return { ok: true, ...res };
    }
    if (normalized === "declined") {
      const res = await this.signatures.handleGovbrCallback({ state, error: "access_denied" });
      return { ok: true, ...res };
    }
    return { ok: true };
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get(":id/download")
  @Header("Cache-Control", "no-store")
  async download(@Param("id") id: string, @Res() res: any) {
    const { signature, bytes } = await this.signatures.getFile(id);
    res.setHeader("content-type", "application/json");
    res.setHeader("content-disposition", `inline; filename="signature-${signature.id}.json"`);
    res.send(bytes);
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get(":id/signed/download")
  @Header("Cache-Control", "no-store")
  async downloadSigned(@Param("id") id: string, @Res() res: any) {
    const { signature, bytes } = await this.signatures.getSignedArtifact(id);
    res.setHeader("content-type", "application/pkcs7-signature");
    res.setHeader("content-disposition", `attachment; filename="signature-${signature.id}.p7s"`);
    res.send(bytes);
  }
}
