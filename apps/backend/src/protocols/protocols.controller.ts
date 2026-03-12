import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { ProtocolsService } from "./protocols.service";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("protocols")
export class ProtocolsController {
  constructor(private protocols: ProtocolsService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get()
  async list() {
    return this.protocols.list();
  }

  @Roles("ADMIN", "COORDINATOR")
  @Post()
  async create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.protocols.create(body);
  }

  @Roles("ADMIN", "COORDINATOR")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>
  ) {
    return this.protocols.update({ id, ...body });
  }
}

