import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneById(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'name', 'createdAt', 'updatedAt'],
    });
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const newUser = this.usersRepository.create(createUserDto);
    const savedUser = await this.usersRepository.save(newUser);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async updateProfile(
    id: string,
    updateData: Partial<User>,
  ): Promise<Omit<User, 'passwordHash'>> {
    delete updateData.passwordHash;
    delete updateData.email;
    delete updateData.id;

    const result = await this.usersRepository.update(id, updateData);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return this.findOneById(id);
  }
}
