import { Controller, Get, Put, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('users')
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
