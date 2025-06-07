import { Controller, Get, Put, Body, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entity/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AssessProficiencyDto } from './dto/assess-proficiency.dto';
import { UserProficiencyAssessment } from '../ai/interface/user-proficiency-assessment.interface';
import { ContentLanguage } from 'src/content/entity/content.entity';
import { AssessmentPrompt } from './entity/assessment-prompt.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getProfile(@GetUser() user: Omit<User, 'passwordHash'>) {
    return user;
  }

  @Put('me')
  updateProfile(
    @GetUser() user: Omit<User, 'passwordHash'>,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateProfile(user.id, updateUserDto);
  }

  @Get('assessment-prompt')
  async getAssessmentPrompt(
    @Query('language') language: ContentLanguage,
  ): Promise<AssessmentPrompt> {
    return this.userService.getAssessmentPrompt(language);
  }

  @Post('assessment')
  async createProficiencyAssessment(
    @GetUser() user: User,
    @Body() assessDto: AssessProficiencyDto,
  ): Promise<UserProficiencyAssessment> {
    return this.userService.createProficiencyAssessment(user.id, assessDto);
  }
}
