import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UserClientExceptionsService } from './user-client-exceptions.service';
import { CreateUserClientExceptionDto } from './dto/create-user-client-exception.dto';
import { UpdateUserClientExceptionDto } from './dto/update-user-client-exception.dto';
import { Auth } from 'src/auth/decorators';
import { Role } from 'src/users/interfaces';

// Dar o quitar acceso a clientes fuera de las carteras es tarea del admin
@Auth(Role.ADMIN)
@Controller('user-client-exceptions')
export class UserClientExceptionsController {
  constructor(
    private readonly exceptionsService: UserClientExceptionsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateUserClientExceptionDto) {
    return this.exceptionsService.create(createDto);
  }

  @Get('user/:userId')
  findAllByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.exceptionsService.findAllByUserId(userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserClientExceptionDto,
  ) {
    return this.exceptionsService.update(id, updateDto);
  }

  @Patch(':id/revoke')
  revokeAccess(@Param('id', ParseIntPipe) id: number) {
    return this.exceptionsService.revokeAccess(id);
  }
}
