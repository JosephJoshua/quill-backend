import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;

  @IsString()
  name: string;

  @IsString({ each: true })
  @IsNotEmpty()
  nativeLanguages: string[];

  @IsString()
  @IsNotEmpty()
  targetLanguage: string;
}
