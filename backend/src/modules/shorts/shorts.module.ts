import { Module } from '@nestjs/common';
import { ShortsController } from './shorts.controller';
import { ShortsService } from './shorts.service';

@Module({
  controllers: [ShortsController],
  providers: [ShortsService],
  exports: [ShortsService],
})
export class ShortsModule {}
