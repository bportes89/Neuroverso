import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { AppointmentsService } from "./appointments.service";

const listSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const createSchema = z.object({
  childId: z.string().uuid(),
  roomId: z.string().uuid(),
  therapistId: z.string().uuid(),
  protocolId: z.string().uuid().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime()
});

const rescheduleSchema = z.object({
  roomId: z.string().uuid().optional(),
  therapistId: z.string().uuid().optional(),
  protocolId: z.string().uuid().nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional()
});

const cancelSchema = z.object({
  reason: z.string().optional()
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("appointments")
export class AppointmentsController {
  constructor(private appointments: AppointmentsService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get()
  async list(@Query(new ZodValidationPipe(listSchema)) query: z.infer<typeof listSchema>) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.appointments.list({ from, to });
  }

  @Roles("ADMIN", "COORDINATOR", "OPERATOR")
  @Post()
  async create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.appointments.create({
      childId: body.childId,
      roomId: body.roomId,
      therapistId: body.therapistId,
      protocolId: body.protocolId,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt)
    });
  }

  @Roles("ADMIN", "COORDINATOR", "OPERATOR")
  @Patch(":id")
  async reschedule(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rescheduleSchema)) body: z.infer<typeof rescheduleSchema>
  ) {
    return this.appointments.reschedule({
      id,
      roomId: body.roomId,
      therapistId: body.therapistId,
      protocolId: body.protocolId,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined
    });
  }

  @Roles("ADMIN", "COORDINATOR", "OPERATOR")
  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Body(new ZodValidationPipe(cancelSchema)) body: z.infer<typeof cancelSchema>) {
    return this.appointments.cancel({ id, reason: body.reason });
  }
}

