import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Role, UserDetailResponseDto } from './interfaces';
import { Auth } from 'src/auth/decorators';
import { UpdateUserDto } from './dto/update-user.dto';

@Auth(Role.ADMIN) // Gestión de usuarios: exclusiva del administrador
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() paginationDto: QueryUserDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get(':codUser')
  findOne(@Param('codUser') codUser: string): Promise<UserDetailResponseDto> {
    return this.usersService.findOne(codUser);
  }

  @Patch(':codUser')
  update(
    @Param('codUser') codUser: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(codUser, updateUserDto);
  }

  @Delete(':codUser')
  remove(@Param('codUser') codUser: string): Promise<{ message: string }> {
    return this.usersService.remove(codUser);
  }
}
