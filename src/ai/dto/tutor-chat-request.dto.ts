import {
  IsString,
  IsNotEmpty,
  IsOptional,
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

  @IsUUID()
  @IsOptional()
  conversationId: string | null;
}
