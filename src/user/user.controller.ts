import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getProfile(@GetUser() user: Omit<User, 'passwordHash'>) {
    return user;
  }

  @Put('me')
  updateProfile(
    @GetUser() user: Omit<User, 'passwordHash'>,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateProfile(user.id, updateUserDto);
  }
}
