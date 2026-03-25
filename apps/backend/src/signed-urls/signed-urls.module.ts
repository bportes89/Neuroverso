import { Module } from "@nestjs/common";
import { SignedUrlsController } from "./signed-urls.controller";
import { SignedUrlsService } from "./signed-urls.service";

@Module({
  controllers: [SignedUrlsController],
  providers: [SignedUrlsService],
  exports: [SignedUrlsService]
})
export class SignedUrlsModule {}
