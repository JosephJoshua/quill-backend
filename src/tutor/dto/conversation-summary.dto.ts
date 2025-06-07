import { Expose } from 'class-transformer';

export class ConversationSummaryDto {
  @Expose() id: string;
  @Expose() title?: string;
  @Expose() updatedAt: Date;
}
