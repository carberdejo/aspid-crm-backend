import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { IndustrySegmentsService } from './industry-segments.service';
import { CreateIndustrySegmentDto } from './dto/create-industry-segment.dto';
import { UpdateIndustrySegmentDto } from './dto/update-industry-segment.dto';
import { QueryIndustrySegmentDto } from './dto/query-industry-segment.dto';
import { Auth, CurrentUser } from 'src/auth/decorators';
import { Role } from 'src/users/interfaces';
import { User } from 'src/users/entities';

@Controller('catalogs/segments')
export class IndustrySegmentsController {
  constructor(private readonly segmentsService: IndustrySegmentsService) {}

  // Solo trae los activos. Cualquiera logueado puede consumirlo.
  @Get()
  @Auth() // Cualquier usuario autenticado puede listar los segmentos
  findAll(
    @Query() query: QueryIndustrySegmentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.segmentsService.findAll(query, currentUser);
  }

  @Post()
  @Auth(Role.ADMIN) // Solo usuarios con rol de administrador pueden crear un segmento
  create(@Body() createDto: CreateIndustrySegmentDto) {
    return this.segmentsService.create(createDto);
  }

  @Patch(':id')
  @Auth(Role.ADMIN) // Solo usuarios con rol de administrador pueden actualizar un segmento
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateIndustrySegmentDto,
  ) {
    return this.segmentsService.update(id, updateDto);
  }

  @Patch(':id/deactivate')
  @Auth(Role.ADMIN) // Solo usuarios con rol de administrador pueden desactivar un segmento
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.segmentsService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Auth(Role.ADMIN) // Solo usuarios con rol de administrador pueden reactivar un segmento
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.segmentsService.reactivate(id);
  }
}
