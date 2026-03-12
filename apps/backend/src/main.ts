import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ENV } from "./config/env.token";
import { type Env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  const env = app.get<Env>(ENV);

  app.enableCors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true
  });

  await app.listen(env.PORT);
}

void bootstrap();
