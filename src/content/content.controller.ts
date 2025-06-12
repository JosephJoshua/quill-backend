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
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { AdminCreateContentDto } from './dto/admin-create-content.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role, User } from '../user/entity/user.entity';
import { ContentListQueryDto } from './dto/content-list-query.dto';
import {
  ContentDetailResponseDto,
  ContentSummaryResponseDto,
} from './dto/content-response.dto';
import { PaginatedResponse } from 'src/util/paginated-response.interface';
import { AdminContentListQueryDto } from './dto/admin-content-list-query.dto';
import { AdminUpdateContentDto } from './dto/admin-update-content.dto';
import { Roles } from '../auth/decorators/role.decorator';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('upload')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', {}))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() createContentDto: AdminCreateContentDto,
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

  @Get('my')
  async getUserContent(@GetUser('id') userId: string) {
    return this.contentService.findAllForUser(userId);
  }

  @Get('all')
  async findAll(
    @Query() query: ContentListQueryDto,
  ): Promise<PaginatedResponse<ContentSummaryResponseDto>> {
    return this.contentService.find(query);
  }

  @Get('recommendations')
  async getRecommendations(
    @GetUser() user: User,
  ): Promise<ContentSummaryResponseDto[]> {
    return this.contentService.getRecommendations(user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentDetailResponseDto> {
    return this.contentService.findOne(id);
  }

  @Post(':id/add-to-library')
  async addToLibrary(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contentService.addToUserContent(id, user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  listContent(@Query() query: AdminContentListQueryDto) {
    return this.contentService.findAll(query);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  updateContentMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: AdminUpdateContentDto,
  ) {
    return this.contentService.updateContentMetadata(id, updateDto);
  }

  @Post(':id/reprocess')
  @Roles(Role.ADMIN)
  reprocessContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.reprocessContent(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.deleteContent(id);
  }
}
