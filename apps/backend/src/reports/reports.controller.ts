import { Controller, Get, Header, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles";
import { ReportsService } from "./reports.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Post("appointments/:appointmentId/pdf")
  async generate(@Param("appointmentId") appointmentId: string, @Req() req: any) {
    const createdById = req.user?.sub ? String(req.user.sub) : null;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return this.reports.generateSessionReport({ appointmentId, createdById, baseUrl });
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get(":reportId/download")
  @Header("Cache-Control", "no-store")
  async download(@Param("reportId") reportId: string, @Res() res: any) {
    const { report, bytes } = await this.reports.getReportFile(reportId);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `inline; filename="report-${report.id}.pdf"`);
    res.send(bytes);
  }
}

