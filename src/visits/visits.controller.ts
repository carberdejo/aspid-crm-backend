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
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiForbiddenResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { QueryVisitDto } from './dto/query-visit.dto';
import { Auth } from 'src/auth/decorators';
import { Role } from 'src/users/interfaces';
import { VisitResponseSchemas } from './schemas/visit-response.schema';

@ApiTags('visits')
@ApiBearerAuth('access-token')
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Crear una nueva visita',
    description:
      'Permite crear una nueva visita asociada a un usuario, cliente y opcionalmente un contacto',
  })
  @ApiResponse({
    status: 201,
    description: 'Visita creada exitosamente',
    schema: VisitResponseSchemas.create,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o contacto no pertenece al cliente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario, cliente o contacto no encontrado',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  create(@Body() createVisitDto: CreateVisitDto) {
    return this.visitsService.create(createVisitDto);
  }

  @Get()
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener todas las visitas con filtros opcionales',
    description:
      'Lista todas las visitas con opciones de filtrado por cliente, usuario y rango de fechas. Incluye paginación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de visitas obtenida exitosamente',
    schema: VisitResponseSchemas.findAll,
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  findAll(@Query() queryVisitDto: QueryVisitDto) {
    return this.visitsService.findAll(queryVisitDto);
  }

  @Get(':id')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener una visita por ID',
    description:
      'Obtiene los detalles completos de una visita específica incluyendo relaciones con usuario, cliente y contacto',
  })
  @ApiResponse({
    status: 200,
    description: 'Visita encontrada',
    schema: VisitResponseSchemas.findOne,
  })
  @ApiResponse({ status: 404, description: 'Visita no encontrada' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  findOne(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
  ) {
    return this.visitsService.findOne(id);
  }

  @Patch(':id')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar una visita existente',
    description:
      'Permite actualizar parcialmente los datos de una visita. Valida que las relaciones con usuario, cliente y contacto sean correctas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Visita actualizada exitosamente',
    schema: VisitResponseSchemas.update,
  })
  @ApiResponse({
    status: 404,
    description: 'Visita, usuario, cliente o contacto no encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o contacto no pertenece al cliente',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  update(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
    @Body() updateVisitDto: UpdateVisitDto,
  ) {
    return this.visitsService.update(id, updateVisitDto);
  }

  @Delete(':id')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar una visita',
    description: 'Elimina permanentemente una visita del sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Visita eliminada exitosamente',
    schema: VisitResponseSchemas.remove,
  })
  @ApiResponse({ status: 404, description: 'Visita no encontrada' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  remove(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
  ) {
    return this.visitsService.remove(id);
  }
}
