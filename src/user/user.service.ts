import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserWithoutPasswordDto } from './dto/user.dto';
import { UserProficiencyAssessment } from '../ai/interface/user-proficiency-assessment.interface';
import { AiService } from '../ai/ai.service';
import { ContentLanguage } from '../content/entity/content.entity';
import { AssessmentPrompt } from './entity/assessment-prompt.entity';
import { AssessProficiencyDto } from './dto/assess-proficiency.dto';
import { ProficiencyAssessment } from './entity/proficiency-assessment.entity';

@Injectable()
export class UserService {
  constructor(
    @Inject()
    private readonly aiService: AiService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AssessmentPrompt)
    private promptRepository: Repository<AssessmentPrompt>,
    @InjectRepository(ProficiencyAssessment)
    private assessmentRepository: Repository<ProficiencyAssessment>,
  ) {}

  async findOneById(id: string): Promise<UserWithoutPasswordDto> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      nativeLanguages: user.nativeLanguages,
      targetLanguage: user.targetLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'name', 'createdAt', 'updatedAt'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<UserWithoutPasswordDto> {
    const newUser = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(newUser);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async updateProfile(
    id: string,
    updateData: Partial<User>,
  ): Promise<UserWithoutPasswordDto> {
    delete updateData.passwordHash;
    delete updateData.email;
    delete updateData.id;

    const result = await this.userRepository.update(id, updateData);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return this.findOneById(id);
  }

  async getAssessmentPrompt(
    language: ContentLanguage,
  ): Promise<AssessmentPrompt> {
    const prompts = await this.promptRepository.find({
      where: { language, isActive: true },
    });

    if (prompts.length === 0) {
      throw new NotFoundException(
        `No active assessment prompts found for language: ${language}`,
      );
    }

    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  async createProficiencyAssessment(
    userId: string,
    dto: AssessProficiencyDto,
  ): Promise<UserProficiencyAssessment> {
    const prompt = await this.promptRepository.findOne({
      where: { id: dto.promptId },
    });
    if (prompt === null) {
      throw new NotFoundException(
        `Assessment prompt with ID "${dto.promptId}" not found`,
      );
    }

    const assessmentResult = await this.aiService.assessUserProficiency(
      prompt.promptText,
      dto.text,
    );

    const assessmentLog = this.assessmentRepository.create({
      userId,
      promptId: dto.promptId,
      submittedText: dto.text,
      assessmentResult,
    });

    await Promise.all([
      this.assessmentRepository.save(assessmentLog),
      this.userRepository.upsert(
        { id: userId, estimatedCefrLevel: assessmentResult.estimatedCefrLevel },
        ['userId'],
      ),
    ]);

    return assessmentResult;
  }
}
