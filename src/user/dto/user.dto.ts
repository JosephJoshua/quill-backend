export class UserWithoutPasswordDto {
  id: string;
  email: string;
  name: string;
  nativeLanguages: string[];
  targetLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}
