import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { PrismaService } from "../prisma/prisma.service";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";
import { type SignatureStatus } from "@prisma/client";

@Injectable()
export class SignaturesService {
  constructor(
    private prisma: PrismaService,
    @Inject(ENV) private env: Env
  ) {}

  async listByReport(reportId: string) {
    const report = await this.prisma.sessionReport.findUnique({ where: { id: reportId }, select: { id: true } });
    if (!report) throw new NotFoundException("Relatório não encontrado");
    await this.prisma.signature.updateMany({
      where: { reportId, status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" }
    });
    return this.prisma.signature.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reportId: true,
        provider: true,
        status: true,
        signUrl: true,
        expiresAt: true,
        signedAt: true,
        signedByName: true,
        signedByDocument: true,
        sha256: true,
        signedSha256: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async list(input: { status?: SignatureStatus; limit?: number; cursor?: string }) {
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const status = input.status;

    if (status === "PENDING") {
      await this.prisma.signature.updateMany({
        where: { status: "PENDING", expiresAt: { lt: new Date() } },
        data: { status: "EXPIRED" }
      });
    }

    const items = await this.prisma.signature.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
      select: {
        id: true,
        reportId: true,
        provider: true,
        status: true,
        signUrl: true,
        expiresAt: true,
        signedAt: true,
        sha256: true,
        signedSha256: true,
        createdAt: true,
        updatedAt: true,
        report: { select: { appointmentId: true, appointment: { select: { child: { select: { name: true } } } } } }
      }
    });

    const hasMore = items.length > limit;
    const sliced = items.slice(0, limit);
    const nextCursor = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;
    return { items: sliced, nextCursor };
  }

  async createForReport(input: { reportId: string; provider?: string; signerName?: string; signerDocument?: string }) {
    const report = await this.prisma.sessionReport.findUnique({ where: { id: input.reportId } });
    if (!report) throw new NotFoundException("Relatório não encontrado");
    const provider = input.provider ?? "MOCK";
    const baseDir = path.resolve(this.env.STORAGE_DIR, "signatures");
    await fs.mkdir(baseDir, { recursive: true });
    const created = await this.prisma.signature.create({
      data: {
        reportId: report.id,
        provider,
        status: "SIGNED",
        signedByName: input.signerName ?? null,
        signedByDocument: input.signerDocument ?? null,
        sha256: report.sha256
      },
      select: { id: true }
    });
    const sidecar = {
      id: created.id,
      provider,
      reportId: report.id,
      sha256: report.sha256,
      signedByName: input.signerName ?? null,
      signedByDocument: input.signerDocument ?? null,
      createdAt: new Date().toISOString(),
      note: "Assinatura lógica (MOCK). Integração GOV.BR pode substituir este provedor."
    };
    const storagePath = path.join(baseDir, `${created.id}.json`);
    await fs.writeFile(storagePath, JSON.stringify(sidecar, null, 2));
    await this.prisma.signature.update({ where: { id: created.id }, data: { storagePath } });
    return { id: created.id };
  }

  async getFile(id: string) {
    const sig = await this.prisma.signature.findUnique({ where: { id } });
    if (!sig || !sig.storagePath) throw new NotFoundException("Assinatura não encontrada");
    const bytes = await fs.readFile(sig.storagePath);
    return { signature: sig, bytes };
  }

  async getSignedArtifact(id: string) {
    const sig = await this.prisma.signature.findUnique({ where: { id } });
    if (!sig || !sig.signedStoragePath) throw new NotFoundException("Documento assinado não encontrado");
    const bytes = await fs.readFile(sig.signedStoragePath);
    return { signature: sig, bytes };
  }

  async startGovbr(input: { reportId: string; requestedById?: string | null; scopes?: string[] }) {
    const report = await this.prisma.sessionReport.findUnique({ where: { id: input.reportId } });
    if (!report) throw new NotFoundException("Relatório não encontrado");
    const clientId = this.env.GOVBR_CLIENT_ID;
    const redirectUri = this.env.GOVBR_REDIRECT_URL;
    const oauthUrl = this.env.GOVBR_OAUTH_URL;
    if (!clientId || !redirectUri || !oauthUrl) throw new NotFoundException("GOV.BR não configurado");
    const state = `${report.id}:${Date.now()}`;
    const nonce = `${Math.random().toString(36).slice(2)}`;
    const scopes = input.scopes?.length ? input.scopes : ["sign", "govbr"];
    const url = new URL(oauthUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const sig = await this.prisma.signature.create({
      data: {
        reportId: report.id,
        provider: "GOVBR",
        status: "PENDING",
        requestedById: input.requestedById ?? null,
        providerRequestId: state,
        signUrl: url.toString(),
        expiresAt,
        sha256: report.sha256
      },
      select: { id: true, signUrl: true, expiresAt: true }
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: input.requestedById ?? null,
        action: "SIGNATURE_START GOVBR",
        entity: "Signature",
        entityId: sig.id,
        meta: { reportId: report.id }
      }
    }).catch(() => null);
    return sig;
  }

  async handleGovbrCallback(input: { state: string; code?: string; error?: string }) {
    const sig = await this.prisma.signature.findFirst({ where: { providerRequestId: input.state } });
    if (!sig) throw new NotFoundException("Solicitação não encontrada");
    if (sig.status !== "PENDING") return { id: sig.id, status: sig.status };
    if (input.error) {
      const next = input.error === "access_denied" ? "DECLINED" : "FAILED";
      await this.prisma.signature.update({ where: { id: sig.id }, data: { status: next, errorMessage: input.error } });
      await this.prisma.auditEvent.create({
        data: { action: `SIGNATURE_${next}`, entity: "Signature", entityId: sig.id, meta: { error: input.error } }
      }).catch(() => null);
      return { id: sig.id, status: next };
    }
    const tokenUrl = this.env.GOVBR_TOKEN_URL;
    const clientId = this.env.GOVBR_CLIENT_ID;
    const clientSecret = this.env.GOVBR_CLIENT_SECRET;
    const redirectUri = this.env.GOVBR_REDIRECT_URL;
    const apiBase = this.env.GOVBR_API_BASE;
    if (!tokenUrl || !clientId || !clientSecret || !redirectUri || !apiBase) {
      await this.prisma.signature.update({ where: { id: sig.id }, data: { status: "FAILED", errorMessage: "Configuração GOV.BR ausente" } });
      await this.prisma.auditEvent.create({
        data: { action: "SIGNATURE_FAILED", entity: "Signature", entityId: sig.id, meta: { reason: "missing_config" } }
      }).catch(() => null);
      return { id: sig.id, status: "FAILED" };
    }
    const body = new URLSearchParams();
    body.set("code", input.code ?? "");
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirectUri);
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });
    if (!tokenRes.ok) {
      await this.prisma.signature.update({
        where: { id: sig.id },
        data: { status: "FAILED", errorMessage: `Token error ${tokenRes.status}` }
      });
      await this.prisma.auditEvent.create({
        data: { action: "SIGNATURE_FAILED", entity: "Signature", entityId: sig.id, meta: { step: "token", status: tokenRes.status } }
      }).catch(() => null);
      return { id: sig.id, status: "FAILED" };
    }
    const tokenJson: any = await tokenRes.json();
    const accessToken = String(tokenJson.access_token ?? "");
    if (!accessToken) {
      await this.prisma.signature.update({
        where: { id: sig.id },
        data: { status: "FAILED", errorMessage: "Access token vazio" }
      });
      await this.prisma.auditEvent.create({
        data: { action: "SIGNATURE_FAILED", entity: "Signature", entityId: sig.id, meta: { step: "token", reason: "empty_access_token" } }
      }).catch(() => null);
      return { id: sig.id, status: "FAILED" };
    }
    const hashBase64 = Buffer.from(Buffer.from(sig.sha256, "hex")).toString("base64");
    const signRes = await fetch(`${apiBase}/externo/v2/assinarPKCS7`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ hashBase64 })
    });
    if (!signRes.ok) {
      await this.prisma.signature.update({
        where: { id: sig.id },
        data: { status: "FAILED", errorMessage: `Sign error ${signRes.status}` }
      });
      await this.prisma.auditEvent.create({
        data: { action: "SIGNATURE_FAILED", entity: "Signature", entityId: sig.id, meta: { step: "sign", status: signRes.status } }
      }).catch(() => null);
      return { id: sig.id, status: "FAILED" };
    }
    const bytes = Buffer.from(await signRes.arrayBuffer());
    const baseDir = path.resolve(this.env.STORAGE_DIR, "signatures");
    await fs.mkdir(baseDir, { recursive: true });
    const signedStoragePath = path.join(baseDir, `${sig.id}.p7s`);
    await fs.writeFile(signedStoragePath, bytes);
    const signedSha256 = createHash("sha256").update(bytes).digest("hex");
    const evidence = {
      id: sig.id,
      provider: "GOVBR",
      reportId: sig.reportId,
      reportSha256: sig.sha256,
      signatureSha256: signedSha256,
      signedAt: new Date().toISOString(),
      providerRequestId: sig.providerRequestId
    };
    const storagePath = path.join(baseDir, `${sig.id}.json`);
    await fs.writeFile(storagePath, JSON.stringify(evidence, null, 2));
    await this.prisma.signature.update({
      where: { id: sig.id },
      data: { status: "SIGNED", signedAt: new Date(), storagePath, signedStoragePath, signedSha256 }
    });
    await this.prisma.auditEvent.create({
      data: { action: "SIGNATURE_SIGNED", entity: "Signature", entityId: sig.id }
    }).catch(() => null);
    return { id: sig.id, status: "SIGNED" };
  }
}
