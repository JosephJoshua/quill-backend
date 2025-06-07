import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class TutorChatRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsUUID()
  contentId: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
