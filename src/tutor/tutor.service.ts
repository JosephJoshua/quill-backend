import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AiService } from 'src/ai/ai.service';
import { Conversation } from 'src/tutor/entity/conversation.entity';
import { Repository } from 'typeorm';
import { TutorChatRequestDto } from './dto/tutor-chat-request.dto';
import { TutorChatResponseDto } from './dto/tutor-chat-response.dto';
import { UserWithoutPasswordDto } from '../user/dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from 'src/util/paginated-response.interface';
import { ConversationSummaryDto } from './dto/conversation-summary.dto';
import { PaginationQueryDto } from '../util/pagination-query.dto';
import { ConversationDetailDto } from './dto/conversation-detail.dto';

@Injectable()
export class TutorService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
  ) {}

  async startOrContinueChat(
    user: UserWithoutPasswordDto,
    chatDto: TutorChatRequestDto,
  ): Promise<TutorChatResponseDto> {
    const response = await this.aiService.getTutorResponse(user, {
      ...chatDto,
      conversationId: chatDto.conversationId || null,
    });

    return plainToInstance(TutorChatResponseDto, response);
  }

  async listConversations(
    userId: string,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginatedResponse<ConversationSummaryDto>> {
    const { page, limit } = paginationDto;
    const [entities, total] = await this.conversationRepo.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = plainToInstance(ConversationSummaryDto, entities);
    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getConversationDetails(
    userId: string,
    conversationId: string,
  ): Promise<ConversationDetailDto> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['dialogues'],
      order: { dialogues: { timestamp: 'ASC' } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation.',
      );
    }

    return plainToInstance(ConversationDetailDto, conversation);
  }
}
