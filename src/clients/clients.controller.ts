import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { CreateContactClientDto } from './dto';
import { Auth, CurrentUser } from 'src/auth/decorators';
import { Role } from 'src/users/interfaces';
import { User } from 'src/users/entities';

@ApiTags('clients')
@ApiBearerAuth('access-token')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Crear un nuevo cliente',
    description: 'Registra un nuevo cliente en el sistema',
  })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  @ApiResponse({ status: 400, description: 'RUC duplicado o datos inválidos' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener todos los clientes',
    description:
      'Lista todos los clientes con filtros opcionales por nombre o RUC. Incluye paginación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes obtenida exitosamente',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  findAll(@Query() query: QueryClientDto, @CurrentUser() user: User) {
    return this.clientsService.findAll(query, user);
  }

  @Get('sunat/:ruc')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Consultar RUC en SUNAT',
    description:
      'Consulta información de un RUC directamente desde la API de SUNAT',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del RUC obtenida de SUNAT',
  })
  @ApiResponse({ status: 404, description: 'RUC no encontrado en SUNAT' })
  @ApiResponse({
    status: 500,
    description: 'Error al consultar API de SUNAT',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  async consultaSunat(@Param('ruc') ruc: string) {
    return this.clientsService.consultSunatApi(ruc);
  }

  @Patch(':id')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar un cliente',
    description: 'Actualiza la información de un cliente existente',
  })
  @ApiResponse({ status: 200, description: 'Cliente actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  update(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Get('contacts/:id')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener un contacto por ID',
    description: 'Obtiene los detalles de un contacto específico',
  })
  @ApiResponse({ status: 200, description: 'Contacto encontrado' })
  @ApiResponse({ status: 404, description: 'Contacto no encontrado' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  findOneContact(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
  ) {
    return this.clientsService.findOneContact(id);
  }

  @Post('contacts')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Crear un contacto para un cliente',
    description: 'Registra un nuevo contacto asociado a un cliente',
  })
  @ApiResponse({ status: 201, description: 'Contacto creado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  createContact(@Body() contactData: CreateContactClientDto) {
    return this.clientsService.createContact(contactData);
  }

  @Get(':id/contacts')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener todos los contactos de un cliente',
    description: 'Lista todos los contactos asociados a un cliente específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de contactos obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  findClientContacts(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
  ) {
    return this.clientsService.findClientContacts(id);
  }

  @Get(':id')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener un cliente por Id',
    description: 'Obtiene los detalles de un cliente específico por su ID',
  })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para realizar esta acción',
  })
  findOne(@Param('id') id: number) {
    return this.clientsService.findByID(id);
  }
}
