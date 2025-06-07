import { Module } from '@nestjs/common';
import { SrsService } from './srs.service';
import { SrsController } from './srs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flashcard } from './entity/flashcard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flashcard])],
  providers: [SrsService],
  controllers: [SrsController],
})
export class SrsModule {}
