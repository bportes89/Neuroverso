import { Module } from "@nestjs/common";
import { LivekitService } from "./livekit.service";
import { ViewerLinksService } from "./viewer-links.service";
import { ViewerLinksController } from "./viewer-links.controller";
import { StreamingController } from "./streaming.controller";

@Module({
  controllers: [ViewerLinksController, StreamingController],
  providers: [LivekitService, ViewerLinksService],
  exports: [LivekitService, ViewerLinksService]
})
export class StreamingModule {}
