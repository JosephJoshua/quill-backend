import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  genre?: string;

  @IsNumber()
  languageId: number;

  @IsString()
  @IsOptional()
  description?: string;
}
