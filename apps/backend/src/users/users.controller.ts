import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { UsersService } from "./users.service";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR"]),
  password: z.string().min(8)
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR"]).optional()
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get("therapists")
  async therapists() {
    return this.users.listTherapists();
  }

  @Roles("ADMIN", "COORDINATOR")
  @Get()
  async list() {
    return this.users.list();
  }

  @Roles("ADMIN", "COORDINATOR")
  @Post()
  async create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.users.create({ ...body, role: body.role as any });
  }

  @Roles("ADMIN", "COORDINATOR")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>
  ) {
    return this.users.update({ id, ...body, role: body.role as any });
  }
}
