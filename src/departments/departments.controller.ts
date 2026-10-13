import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Auth, CurrentUser } from 'src/auth/decorators';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly accessScopeService: AccessScopeService,
  ) {}

  @Auth(Role.ADMIN)
  @Post()
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.departmentsService.findAll(paginationDto);
  }

  // Usuarios activos del área para los selectores de responsable y colaborador.
  // El admin consulta cualquier área; un user solo las suyas (código 130)
  @Get(':id/members')
  findMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.accessScopeService.findDepartmentMembers(user, id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(+id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(+id, updateDepartmentDto);
  }

  @Auth(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(+id);
  }
}
