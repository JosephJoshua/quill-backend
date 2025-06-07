import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entity/user.entity';
import { AssessmentPrompt } from './entity/assessment-prompt.entity';
import { ProficiencyAssessment } from './entity/proficiency-assessment.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AssessmentPrompt, ProficiencyAssessment]),
    AiModule,
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
