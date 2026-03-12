import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { PrismaService } from "../prisma/prisma.service";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";

@Injectable()
export class ShortsService {
  constructor(
    private prisma: PrismaService,
    @Inject(ENV) private env: Env
  ) {}

  async listByAppointment(appointmentId: string) {
    return this.prisma.shortClip.findMany({
      where: { appointmentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, durationMs: true, mimeType: true, sha256: true, createdAt: true }
    });
  }

  async create(input: {
    appointmentId: string;
    createdById?: string | null;
    mimeType: string;
    durationMs: number;
    bytes: Buffer;
  }) {
    const session = await this.prisma.session.findUnique({
      where: { appointmentId: input.appointmentId },
      select: { status: true }
    });
    if (!session || session.status !== "IN_PROGRESS") throw new ConflictException("Sessão precisa estar em andamento");

    const id = randomUUID();
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    const ext = input.mimeType.includes("webm") ? "webm" : "bin";
    const storagePath = path.join(this.env.STORAGE_DIR, "shorts", `${id}.${ext}`);

    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, input.bytes);

    return this.prisma.shortClip.create({
      data: {
        id,
        appointmentId: input.appointmentId,
        createdById: input.createdById ?? null,
        durationMs: input.durationMs,
        mimeType: input.mimeType,
        storagePath,
        sha256
      }
    });
  }

  async getFile(shortId: string) {
    const clip = await this.prisma.shortClip.findUnique({ where: { id: shortId } });
    if (!clip) throw new NotFoundException("Short não encontrado");
    const bytes = await fs.readFile(clip.storagePath);
    return { clip, bytes };
  }
}
