import { IsEnum, IsOptional } from 'class-validator';
import { ProcessingStatus } from '../entity/content.entity';
import { PaginationQueryDto } from '../../util/pagination-query.dto';

export class AdminContentListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ProcessingStatus)
  status?: ProcessingStatus;
}
