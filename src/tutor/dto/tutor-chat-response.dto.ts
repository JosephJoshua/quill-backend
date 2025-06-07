import { Expose } from 'class-transformer';

export class TutorChatResponseDto {
  @Expose() response: string;
  @Expose() dialogueId: string;
  @Expose() conversationId: string;
}