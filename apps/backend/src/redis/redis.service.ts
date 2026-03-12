import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { ENV } from "../config/env.token";
import { type Env } from "../config/env";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(@Inject(ENV) private env: Env) {
    this.client = new Redis(this.env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
