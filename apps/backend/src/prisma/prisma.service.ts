import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({
      datasources: {
        db: {
          url: env.DATABASE_URL
        }
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
