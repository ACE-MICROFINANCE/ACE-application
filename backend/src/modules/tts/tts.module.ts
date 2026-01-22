import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';

@Module({
  imports: [HttpModule],
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
