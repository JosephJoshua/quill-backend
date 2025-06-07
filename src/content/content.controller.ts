import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entity/user.entity';
import { ContentListQueryDto } from './dto/content-list-query.dto';
import {
  ContentDetailResponseDto,
  ContentSummaryResponseDto,
} from './dto/content-response.dto';
import { PaginatedResponse } from 'src/util/paginated-response.interface';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {}))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() createContentDto: CreateContentDto,
    @GetUser() user: Omit<User, 'passwordHash'>,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for upload.');
    }

    return this.contentService.uploadAndCreateContent(
      file,
      createContentDto,
      user,
    );
  }

  @Get()
  async getUserContent(@GetUser('id') userId: string) {
    return this.contentService.findAllForUser(userId);
  }

  @Get('all')
  async findAll(
    @Query() query: ContentListQueryDto,
  ): Promise<PaginatedResponse<ContentSummaryResponseDto>> {
    return this.contentService.find(query);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentDetailResponseDto> {
    return this.contentService.findOne(id);
  }

  @Get('recommendations')
  async getRecommendations(
    @GetUser() user: User,
  ): Promise<ContentSummaryResponseDto[]> {
    return this.contentService.getRecommendations(user.id);
  }
}
