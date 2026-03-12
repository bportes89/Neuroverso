import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { SessionsService } from "./sessions.service";

const noteSchema = z.object({
  text: z.string().min(1)
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("sessions")
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get(":appointmentId")
  async get(@Param("appointmentId") appointmentId: string) {
    return this.sessions.getByAppointment(appointmentId);
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST")
  @Post(":appointmentId/start")
  async start(@Param("appointmentId") appointmentId: string) {
    return this.sessions.start(appointmentId);
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST")
  @Post(":appointmentId/end")
  async end(@Param("appointmentId") appointmentId: string) {
    return this.sessions.end(appointmentId);
  }

  @Roles("ADMIN", "COORDINATOR", "THERAPIST")
  @Post(":appointmentId/notes")
  async addNote(
    @Param("appointmentId") appointmentId: string,
    @Req() req: any,
    @Body(new ZodValidationPipe(noteSchema)) body: z.infer<typeof noteSchema>
  ) {
    const authorId = req.user.sub as string;
    return this.sessions.addNote({ appointmentId, authorId, text: body.text });
  }
}

