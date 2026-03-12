import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles";
import { RolesGuard } from "../auth/roles.guard";
import { ChildrenService } from "./children.service";

const createSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("children")
export class ChildrenController {
  constructor(private children: ChildrenService) {}

  @Roles("ADMIN", "COORDINATOR", "THERAPIST", "OPERATOR")
  @Get()
  async list() {
    return this.children.list();
  }

  @Roles("ADMIN", "COORDINATOR")
  @Post()
  async create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.children.create(body);
  }

  @Roles("ADMIN", "COORDINATOR")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>
  ) {
    return this.children.update({ id, ...body });
  }
}

