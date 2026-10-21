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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  HttpCode,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, type Response } from 'express';
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
  create(@Body() createClientDto: CreateClientDto, @CurrentUser() user: User) {
    return this.clientsService.create(createClientDto, user);
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
  @Auth(Role.ADMIN) // Solo el admin edita clientes; los empleados solo los leen
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
    @CurrentUser() user: User,
  ) {
    return this.clientsService.findOneContact(id, user);
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
  createContact(
    @Body() contactData: CreateContactClientDto,
    @CurrentUser() user: User,
  ) {
    return this.clientsService.createContact(contactData, user);
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
    @CurrentUser() user: User,
  ) {
    return this.clientsService.findClientContacts(id, user);
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
  findOne(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
    @CurrentUser() user: User,
  ) {
    return this.clientsService.findByID(id, user);
  }

  @Post('import-excel')
  @Auth(Role.ADMIN) // Carga masiva: exclusiva del admin
  @UseInterceptors(FileInterceptor('file')) // 'file' será el nombre del campo en el FormData del frontend
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    // Validar extensión (opcional pero recomendado)
    if (!file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      throw new BadRequestException(
        'El archivo debe ser un Excel válido (.xlsx, .xls, .csv)',
      );
    }

    return await this.clientsService.importFromExcel(file.buffer);
  }

  @Post('export-excel')
  @Auth(Role.ADMIN) // Exporta la base completa de clientes: exclusivo del admin
  @HttpCode(HttpStatus.OK)
  async exportExcel(@Res() res: Response, @Body() filters: QueryClientDto) {
    try {
      // Le pasamos el término de búsqueda al servicio
      const buffer = await this.clientsService.exportToExcel(filters);

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename=Maestra_Clientes_ASPID.xlsx',
        'Content-Length': buffer.length.toString(), // Importante convertir a string en Express
      });

      res.end(buffer);
    } catch {
      throw new BadRequestException('Error al exportar los datos');
    }
  }
}
