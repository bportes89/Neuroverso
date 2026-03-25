import { Body, Controller, Get, Header, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles";
import { SignedUrlsService } from "./signed-urls.service";

const createSchema = z.object({
  resource: z.enum(["REPORT_PDF", "SIGNED_REPORT_PDF", "SIGNATURE_EVIDENCE", "SHORT_CLIP"]),
  resourceId: z.string().uuid(),
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24).default(60 * 15)
});

@Controller("signed-urls")
export class SignedUrlsController {
  constructor(private signedUrls: SignedUrlsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Post()
  async create(@Req() req: any, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    const createdById = req.user?.sub ? String(req.user.sub) : null;
    const { token, expiresAt } = await this.signedUrls.create({
      resource: body.resource,
      resourceId: body.resourceId,
      ttlSeconds: body.ttlSeconds,
      createdById
    });
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return { token, expiresAt: expiresAt.toISOString(), url: `${baseUrl}/signed-urls/${token}/download` };
  }

  @Get(":token/download")
  @Header("Cache-Control", "no-store")
  async download(@Param("token") token: string, @Res() res: any) {
    const file = await this.signedUrls.getFileFromToken(token);
    res.setHeader("content-type", file.contentType);
    res.setHeader("content-disposition", `inline; filename="${file.fileName}"`);
    res.send(file.bytes);
  }
}

