import { Module } from "@nestjs/common";
import { LivekitService } from "./livekit.service";
import { ViewerLinksService } from "./viewer-links.service";
import { ViewerLinksController } from "./viewer-links.controller";
import { StreamingController } from "./streaming.controller";
import { DeviceMirrorLinksController } from "./device-mirror-links.controller";
import { DeviceMirrorLinksService } from "./device-mirror-links.service";

@Module({
  controllers: [ViewerLinksController, StreamingController, DeviceMirrorLinksController],
  providers: [LivekitService, ViewerLinksService, DeviceMirrorLinksService],
  exports: [LivekitService, ViewerLinksService, DeviceMirrorLinksService]
})
export class StreamingModule {}
