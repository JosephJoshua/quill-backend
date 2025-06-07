import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsString({ each: true })
  @IsNotEmpty()
  nativeLanguages: string[];

  @IsString()
  @IsNotEmpty()
  targetLanguage: string;
}
