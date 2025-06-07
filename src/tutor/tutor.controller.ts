import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from 'src/user/entity/user.entity';
import { TutorChatRequestDto } from './dto/tutor-chat-request.dto';
import { TutorChatResponseDto } from './dto/tutor-chat-response.dto';
import { PaginationQueryDto } from 'src/util/pagination-query.dto';
import { PaginatedResponse } from 'src/util/paginated-response.interface';
import { ConversationSummaryDto } from './dto/conversation-summary.dto';
import { TutorService } from './tutor.service';
import { ConversationDetailDto } from './dto/conversation-detail.dto';

@Controller('tutor')
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Post('chat')
  async chat(
    @GetUser() user: User,
    @Body() chatDto: TutorChatRequestDto,
  ): Promise<TutorChatResponseDto> {
    return this.tutorService.startOrContinueChat(user, chatDto);
  }

  @Get('conversations')
  async listConversations(
    @GetUser() user: User,
    @Query() paginationDto: PaginationQueryDto,
  ): Promise<PaginatedResponse<ConversationSummaryDto>> {
    return this.tutorService.listConversations(user.id, paginationDto);
  }

  @Get('conversations/:id')
  async getConversationDetails(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationDetailDto> {
    return this.tutorService.getConversationDetails(user.id, id);
  }
}
