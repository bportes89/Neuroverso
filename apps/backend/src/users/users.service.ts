import { Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { type Role } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
  }

  async listTherapists() {
    return this.prisma.user.findMany({
      where: { role: { in: ["THERAPIST", "COORDINATOR", "ADMIN"] } },
      select: { id: true, email: true, name: true, role: true }
    });
  }

  async create(input: { email: string; name: string; role: Role; password: string }) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: { email: input.email, name: input.name, role: input.role, passwordHash },
      select: { id: true }
    });
    return user;
  }

  async update(input: { id: string; name?: string; role?: Role }) {
    const existing = await this.prisma.user.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Usuário não encontrado");
    return this.prisma.user.update({
      where: { id: input.id },
      data: { name: input.name, role: input.role },
      select: { id: true }
    });
  }
}
