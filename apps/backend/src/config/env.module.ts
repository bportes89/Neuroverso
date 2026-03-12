import { Global, Module } from "@nestjs/common";
import { ENV } from "./env.token";
import { loadEnv } from "./env";

@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useValue: loadEnv(process.env)
    }
  ],
  exports: [ENV]
})
export class EnvModule {}

