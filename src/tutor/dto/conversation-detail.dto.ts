import { ConversationSummaryDto } from './conversation-summary.dto';
import { Expose } from 'class-transformer';

export class Dialogue {
  @Expose() id: string;
  @Expose() userMessage: string;
  @Expose() aiResponse: string;
  @Expose() timestamp: Date;
}

export class ConversationDetailDto extends ConversationSummaryDto {
  @Expose() dialogues: Dialogue[];
}
