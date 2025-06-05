import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../user/user.entity';

export const GetUser = createParamDecorator(
  (
    data: keyof Omit<User, 'passwordHash'>,
    ctx: ExecutionContext,
  ):
    | Omit<User, 'passwordHash'>
    | Omit<User, 'passwordHash'>[keyof Omit<User, 'passwordHash'>] => {
    const request = ctx.switchToHttp().getRequest() satisfies {
      user: Omit<User, 'passwordHash'>;
    };

    const user = request.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    if (data && data in user) {
      return user[data];
    }

    return user;
  },
);
