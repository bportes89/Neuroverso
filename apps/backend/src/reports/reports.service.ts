import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma/prisma.service";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    @Inject(ENV) private env: Env
  ) {}

  async generateSessionReport(input: { appointmentId: string; createdById?: string | null; baseUrl: string }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: {
        child: true,
        room: true,
        therapist: { select: { id: true, name: true, email: true } },
        protocol: true,
        session: { include: { notes: { include: { author: { select: { id: true, name: true, email: true } } } } } },
        shorts: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!appointment) throw new NotFoundException("Agendamento não encontrado");

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (d) => chunks.push(Buffer.from(d)));

    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(18).text("Neuroverso — Relatório de Sessão", { underline: true });
    doc.moveDown();

    doc.fontSize(12).text(`Criança: ${appointment.child.name}`);
    doc.text(`Terapeuta: ${appointment.therapist.name} (${appointment.therapist.email})`);
    doc.text(`Sala: ${appointment.room.name}`);
    doc.text(`Protocolo: ${appointment.protocol?.name ?? "—"}`);
    doc.text(`Início agendado: ${appointment.startAt.toISOString()}`);
    doc.text(`Fim agendado: ${appointment.endAt.toISOString()}`);
    doc.text(`Status sessão: ${appointment.session?.status ?? "—"}`);
    doc.moveDown();

    doc.fontSize(14).text("Observações", { underline: true });
    doc.moveDown(0.5);
    const notes = appointment.session?.notes ?? [];
    if (notes.length === 0) {
      doc.fontSize(12).text("Sem observações.");
    } else {
      for (const n of notes) {
        doc.fontSize(12).text(`${n.author.name} — ${n.createdAt.toISOString()}`);
        doc.fontSize(12).text(n.text);
        doc.moveDown(0.5);
      }
    }
    doc.moveDown();

    doc.fontSize(14).text("Shorts clínicos", { underline: true });
    doc.moveDown(0.5);
    if (appointment.shorts.length === 0) {
      doc.fontSize(12).text("Sem shorts.");
    } else {
      for (const s of appointment.shorts) {
        const url = `${input.baseUrl}/shorts/${s.id}/download`;
        doc.fontSize(12).text(`Short ${s.id} (${Math.round(s.durationMs / 1000)}s)`);
        doc.fontSize(10).text(`SHA-256: ${s.sha256}`);
        doc.fontSize(10).text(`Link: ${url}`);
        doc.moveDown(0.5);
      }
    }

    doc.end();
    const pdfBytes = await done;

    const reportId = randomUUID();
    const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
    const storagePath = path.join(this.env.STORAGE_DIR, "reports", `${reportId}.pdf`);
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, pdfBytes);

    const report = await this.prisma.sessionReport.create({
      data: {
        id: reportId,
        appointmentId: appointment.id,
        createdById: input.createdById ?? null,
        storagePath,
        sha256
      }
    });

    return { reportId: report.id, sha256: report.sha256, createdAt: report.createdAt.toISOString() };
  }

  async getReportFile(reportId: string) {
    const report = await this.prisma.sessionReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException("Relatório não encontrado");
    const bytes = await fs.readFile(report.storagePath);
    return { report, bytes };
  }
}

