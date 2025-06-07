import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class AssessProficiencyDto {
  @IsUUID()
  promptId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(50, {
    message:
      'Please provide at least 50 characters for an accurate assessment.',
  })
  text: string;
}
