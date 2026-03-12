import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { type Role } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async bootstrapAdmin(input: { email: string; name: string; password: string }) {
    const count = await this.prisma.user.count();
    if (count > 0) {
      throw new UnauthorizedException("Bootstrap já realizado");
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash, role: "ADMIN" }
    });
    return this.sign(user.id, user.role);
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new UnauthorizedException("Credenciais inválidas");
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Credenciais inválidas");
    return this.sign(user.id, user.role);
  }

  private sign(sub: string, role: Role) {
    return {
      token: this.jwt.sign({ sub, role }, { expiresIn: "12h" })
    };
  }
}
