import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { RoomsService } from "./rooms.service";

const createSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional()
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("rooms")
export class RoomsController {
  constructor(private rooms: RoomsService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get()
  async list() {
    return this.rooms.list();
  }

  @Roles("ADMIN", "COORDINATOR")
  @Post()
  async create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.rooms.create(body);
  }

  @Roles("ADMIN", "COORDINATOR")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>
  ) {
    return this.rooms.update({ id, ...body });
  }
}

