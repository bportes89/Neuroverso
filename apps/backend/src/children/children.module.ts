import { Module } from "@nestjs/common";
import { ChildrenController } from "./children.controller";
import { ChildrenService } from "./children.service";

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService]
})
export class ChildrenModule {}

