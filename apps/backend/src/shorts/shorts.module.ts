import { Module } from "@nestjs/common";
import { StreamingModule } from "../streaming/streaming.module";
import { ShortsController } from "./shorts.controller";
import { ShortsService } from "./shorts.service";

@Module({
  imports: [StreamingModule],
  controllers: [ShortsController],
  providers: [ShortsService]
})
export class ShortsModule {}
