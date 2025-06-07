import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../util/pagination-query.dto';
import { ContentLanguage } from '../../content/entity/content.entity';

export class FlashcardListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ContentLanguage)
  language?: ContentLanguage;
}
