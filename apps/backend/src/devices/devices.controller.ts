import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { DevicesService } from "./devices.service";

const createSchema = z.object({
  name: z.string().min(1),
  kind: z.string().min(1),
  serial: z.string().min(1).optional(),
  roomId: z.string().uuid().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  serial: z.string().min(1).nullable().optional(),
  roomId: z.string().uuid().nullable().optional()
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("devices")
export class DevicesController {
  constructor(private devices: DevicesService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get()
  async list() {
    return this.devices.list();
  }

  @Roles("ADMIN", "COORDINATOR")
  @Post()
  async create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.devices.create(body);
  }

  @Roles("ADMIN", "COORDINATOR")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>
  ) {
    return this.devices.update({ id, ...body });
  }
}

