import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { Client, ContactClient } from './entities';
import { QueryClientDto } from './dto/query-client.dto';
import { ApiException } from 'src/common/exceptions/api.exception';
import { RucResponse } from './interfaces/ruc-response.interfaces';
import { CreateContactClientDto } from './dto';
import {
  ClientNotFoundException,
  ClientRucAlreadyExistsException,
  ContactClientNotFoundException,
} from './exceptions/client.exceptions';
import { User } from 'src/users/entities';
import { PortfolioUser } from 'src/portfolios/entities/portfolio-user.entity';
import * as xlsx from 'xlsx';
import { Portfolio } from 'src/portfolios/entities/portfolio.entity';
import { IndustrySegment } from 'src/catalogs/entities/industry-segment.entity';
import * as xlsxStyle from 'xlsx-js-style';
@Injectable()
export class ClientsService {
  protected readonly logger = new Logger(ClientsService.name);
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ContactClient)
    private readonly contactClientRepository: Repository<ContactClient>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(IndustrySegment)
    private readonly segmentRepository: Repository<IndustrySegment>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
  ) {}

  async create(createClientDto: CreateClientDto) {
    const existingClient = await this.clientRepository.findOneBy({
      ruc: createClientDto.ruc,
    });
    if (existingClient)
      throw new ClientRucAlreadyExistsException(createClientDto.ruc);

    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);

    this.logger.log(`Cliente creado exitosamente con ID: ${savedClient.id}`);

    return {
      data: {
        message: 'Cliente creado exitosamente con el RUC: ' + savedClient.ruc,
        item: savedClient,
      },
    };
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    this.logger.log(`Actualizando cliente con ID: ${id}`);

    const existingClient = await this.clientRepository.findOneBy({ id });
    if (!existingClient) throw new ClientNotFoundException(id);

    // Si se está actualizando el RUC, verificar que no esté duplicado
    if (updateClientDto.ruc && updateClientDto.ruc !== existingClient.ruc) {
      const duplicateRuc = await this.clientRepository.findOneBy({
        ruc: updateClientDto.ruc,
      });
      if (duplicateRuc)
        throw new ClientRucAlreadyExistsException(updateClientDto.ruc);
    }

    // Actualizar el cliente
    const updatedClient = await this.clientRepository.save({
      ...existingClient,
      ...updateClientDto,
    });

    this.logger.log(`Cliente con ID ${id} actualizado exitosamente`);

    return {
      message: 'Cliente actualizado exitosamente',
      data: updatedClient,
    };
  }

  async findAll(query: QueryClientDto, currentUser: User) {
    const { term, limit = 10, offset = 0, portfolioId, segmentId } = query;

    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .leftJoin('client.segment', 'segment')
      .addSelect(['segment.id', 'segment.code', 'segment.isActive'])
      .leftJoin('client.portfolio', 'portfolio')
      .addSelect(['portfolio.id', 'portfolio.code', 'portfolio.isActive']);

    // 1. Agregamos el COUNT como una subconsulta mapeada a la propiedad 'contacts'
    queryBuilder.loadRelationCountAndMap(
      'client.contacts', // El nombre de la propiedad virtual
      'client.contacts', // La relación definida en tu Entidad Client
    );

    // 2. FILTRO DE SEGURIDAD INTERNO (Para usuarios no-admin)
    // Usamos "Return Early" para despachar rápido si el usuario no tiene accesos
    if (currentUser.role !== 'admin') {
      const allowedIds = await this.getUserPortfolioIds(currentUser.id);

      if (allowedIds.length === 0) return this.emptyResponse(limit, offset);
      if (portfolioId && !allowedIds.includes(+portfolioId)) {
        throw new ForbiddenException('No tienes permisos para esta cartera.');
      }

      // Si no filtró por una cartera específica, le inyectamos todas sus carteras permitidas
      if (!portfolioId) {
        queryBuilder.andWhere('client.portfolioId IN (:...allowedIds)', {
          allowedIds,
        });
      }
    }

    // query
    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('client.commercialName ILIKE :term', { term: `%${term}%` })
            .orWhere('client.businessName ILIKE :term', { term: `%${term}%` })
            .orWhere('client.ruc ILIKE :term', { term: `%${term}%` });
        }),
      );
    }

    if (portfolioId)
      queryBuilder.andWhere('client.portfolioId = :portfolioId', {
        portfolioId,
      });

    if (segmentId)
      queryBuilder.andWhere('client.segmentId = :segmentId', { segmentId });

    // 3. Ejecución
    const [clients, total] = await queryBuilder
      .orderBy('client.createdAt', query.order || 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: {
        items: clients,
        total,
        limit: +limit,
        offset: +offset,
      },
    };
  }

  async createContact(contactData: CreateContactClientDto) {
    const client = await this.clientRepository.findOneBy({
      id: contactData.clientId,
    });
    if (!client) throw new ClientNotFoundException(contactData.clientId);

    const contact = this.contactClientRepository.create(contactData);
    const savedContact = await this.contactClientRepository.save(contact);

    this.logger.log(`Contacto creado exitosamente con ID: ${savedContact.id}`);

    return {
      data: {
        message: 'Contacto creado exitosamente',
        item: savedContact,
      },
    };
  }

  async findClientContacts(clientId: number) {
    this.logger.log(`Buscando contactos del cliente ID: ${clientId}`);

    const client = await this.clientRepository.findOneBy({ id: clientId });

    if (!client) throw new ClientNotFoundException(clientId);

    const contacts = await this.contactClientRepository.find({
      where: { clientId },
    });

    return {
      message: 'Contactos obtenidos exitosamente',
      data: contacts,
      total: contacts.length,
    };
  }

  async findOneContact(id: number) {
    this.logger.log(`Buscando contacto con ID: ${id}`);

    const contact = await this.contactClientRepository.findOne({
      where: { id },
      relations: ['client'],
    });

    if (!contact) throw new ContactClientNotFoundException(id);

    return {
      message: 'Contacto obtenido exitosamente',
      data: contact,
    };
  }

  async findByID(id: number) {
    this.logger.log(`Buscando cliente con ID: ${id}`);

    const client = await this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.contacts', 'contacts')
      .where('client.id = :id', { id: id })
      .getOne();

    if (!client) throw new ClientNotFoundException(id);

    return client;
  }

  async consultSunatApi(ruc: string): Promise<{
    message: string;
    data: Pick<
      RucResponse,
      'ruc' | 'razonSocial' | 'direccion' | 'distrito' | 'provincia'
    >;
  }> {
    try {
      this.logger.log(`Consultando RUC ${ruc} en API de SUNAT`);

      const token = this.configService.get<string>('SUNAT_TOKEN');

      if (!token) {
        throw new ApiException(
          500,
          'No se encontró SUNAT_TOKEN en la configuración',
          [],
          500,
        );
      }

      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      try {
        const response = await fetch(
          `https://dniruc.apisperu.com/api/v1/ruc/${ruc}?token=${token}`,
          {
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new NotFoundException(`RUC ${ruc} no encontrado en SUNAT`);
          }
          throw new ApiException(
            response.status,
            'Error al consultar la API de SUNAT',
            [],
            response.status,
          );
        }

        const data = (await response.json()) as RucResponse;

        return {
          message: 'Información de RUC obtenida exitosamente',
          data: {
            ruc: data.ruc,
            razonSocial: data.razonSocial,
            direccion: data.direccion,
            distrito: data.distrito,
            provincia: data.provincia,
          },
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new ApiException(
            408,
            'Timeout al consultar la API de SUNAT - La solicitud tardó demasiado',
            [],
            408,
          );
        }

        throw fetchError;
      }
    } catch (error) {
      if (error instanceof ApiException) throw error;

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al consultar API SUNAT: ${errorMessage}`);
      throw new ApiException(
        500,
        'Error al consultar la API de SUNAT',
        [errorMessage],
        500,
      );
    }
  }

  private async getUserPortfolioIds(userId: number): Promise<number[]> {
    const assignments = await this.dataSource
      .getRepository(PortfolioUser)
      .find({ where: { userId } });
    return assignments.map((a) => Number(a.portfolioId));
  }

  private emptyResponse(limit: number, offset: number) {
    return {
      data: { items: [], total: 0, limit: +limit, offset: +offset },
    };
  }

  //===============HELPERS================

  async importFromExcel(fileBuffer: Buffer) {
    try {
      const getCellText = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value).trim();
        }
        return undefined;
      };

      // 1. Leer el Excel en Memoria
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawData: Record<string, unknown>[] = xlsx.utils.sheet_to_json(
        worksheet,
        {
          range: 2,
          defval: null,
        },
      );

      if (rawData.length === 0) {
        throw new BadRequestException(
          'El archivo Excel no contiene datos válidos después del encabezado.',
        );
      }

      // 2. Precarga de Datos Maestros
      const segments = await this.segmentRepository.find();
      const portfolios = await this.portfolioRepository.find();

      const segmentMap = new Map<string, number>();
      segments.forEach((s) =>
        segmentMap.set(s.code.toUpperCase(), Number(s.id)),
      );

      const portfolioMap = new Map<string, number>();
      portfolios.forEach((p) =>
        portfolioMap.set(p.code.toUpperCase(), Number(p.id)),
      );

      // CAMBIO CLAVE: Traemos el ID además del RUC y creamos un Map
      const existingClients = await this.clientRepository.find({
        select: ['id', 'ruc'],
      });
      const existingClientMap = new Map<string, number>();
      existingClients.forEach((c) =>
        existingClientMap.set(c.ruc, Number(c.id)),
      );

      // 3. Variables para el Reporte y Control
      const clientsToSave: Partial<Client>[] = [];
      const updatedRucs: string[] = [];
      const errorsRow: { row: number; reason: string }[] = [];

      let insertedCount = 0;
      let updatedCount = 0;

      // Control para evitar duplicados dentro del MISMO Excel
      const processedRucsInThisExcel = new Set<string>();

      // 4. Transformación de la Data
      for (let i = 0; i < rawData.length; i++) {
        const originalRow = rawData[i];

        const row: Record<string, unknown> = {};
        for (const key in originalRow) {
          row[key.trim().toUpperCase()] = originalRow[key];
        }

        const ruc = getCellText(row['RUC']);
        const businessName = getCellText(row['RAZON SOCIAL']);

        // Validación obligatoria
        if (!ruc || !businessName) {
          errorsRow.push({ row: i + 4, reason: 'Falta RUC o Razón Social' });
          continue;
        }

        // Protección contra duplicados en el propio archivo Excel
        if (processedRucsInThisExcel.has(ruc)) {
          errorsRow.push({
            row: i + 4,
            reason: 'RUC duplicado dentro del mismo archivo Excel',
          });
          continue;
        }
        processedRucsInThisExcel.add(ruc);

        // Búsqueda en los Hash Maps
        const portfolioCode = getCellText(row['ACTUAL'])?.toUpperCase();
        const segmentCode = (
          getCellText(row['SEGMENTO']) || getCellText(row['SEGMENT'])
        )?.toUpperCase();

        // CAMBIO CLAVE: Verificamos si ya existe en BD para hacer Upsert
        const existingId = existingClientMap.get(ruc);

        const clientObj: Partial<Client> = {
          // Si el ID existe, se lo pasamos. TypeORM hará un UPDATE automático.
          ...(existingId && { id: existingId }),
          ruc: ruc,
          businessName: businessName,
          commercialName: businessName,
          address: getCellText(row['DIRECCION']) || '',
          province: getCellText(row['PROVINCIA']),
          district: getCellText(row['DISTRITO FISCAL']),
          zone: getCellText(row['ZONA']),
          portfolioId: portfolioCode
            ? portfolioMap.get(portfolioCode)
            : undefined,
          segmentId: segmentCode ? segmentMap.get(segmentCode) : undefined,
        };

        // Contadores para el frontend
        if (existingId) {
          updatedCount++;
          updatedRucs.push(ruc);
        } else {
          insertedCount++;
        }

        clientsToSave.push(clientObj);
      }

      // 5. Inserción / Actualización por Lotes (Upsert)
      const chunkSize = 500;

      for (let i = 0; i < clientsToSave.length; i += chunkSize) {
        const chunk = clientsToSave.slice(i, i + chunkSize);
        // .save() inserta los que no tienen ID y actualiza los que sí tienen ID
        // await this.clientRepository.save(chunk);
        await this.clientRepository
          .createQueryBuilder()
          .insert()
          .into(Client)
          .values(chunk)
          .orUpdate(
            // Lista de columnas que se van a actualizar si el RUC ya existe
            [
              'commercial_name',
              'business_name',
              'address',
              'province',
              'district',
              'zone',
              'portfolio_id',
              'segment_id',
            ],
            // La columna que tiene la restricción UNIQUE
            ['ruc'],
          )
          .execute();
      }

      // 6. Retornar el Reporte modificado para el Upsert
      return {
        message: 'Proceso de importación y sincronización finalizado',
        stats: {
          totalRowsProcessed: rawData.length,
          successfullyInserted: insertedCount,
          successfullyUpdated: updatedCount,
          errorsCount: errorsRow.length,
        },
        details: {
          updatedRucs: updatedRucs,
          errors: errorsRow,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error importando Excel: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        'Error al procesar el archivo Excel. Verifica el formato.',
      );
    }
  }

  async exportToExcel2(filter: QueryClientDto): Promise<Buffer> {
    try {
      // 1. Usamos QueryBuilder para aplicar los mismos filtros que en el GET /clients
      const query = this.clientRepository
        .createQueryBuilder('client')
        .leftJoinAndSelect('client.segment', 'segment')
        .leftJoinAndSelect('client.portfolio', 'portfolio')
        .orderBy('client.id', 'ASC');

      // Si el frontend envía un término de búsqueda, filtramos
      if (filter.term) {
        query.andWhere(
          '(client.commercialName ILIKE :term OR client.businessName ILIKE :term OR client.ruc ILIKE :term)',
          { term: `%${filter.term}%` },
        );
      }

      if (filter.segmentId) {
        query.andWhere('client.segmentId = :segmentId', {
          segmentId: filter.segmentId,
        });
      }

      if (filter.portfolioId) {
        query.andWhere('client.portfolioId = :portfolioId', {
          portfolioId: filter.portfolioId,
        });
      }

      // getMany() trae todos los resultados que coincidan (sin paginación)
      const clients = await query.getMany();

      // 2. Mapeo exacto para la Plantilla Excel
      const dataToExport = clients.map((client, index) => ({
        ITEM: index + 1,
        ANTERIO: 'N/C',
        ACTUAL: client.portfolio?.code || '',
        SEGMENTO: client.segment?.code || '',
        'RAZON SOCIAL': client.businessName,
        RUC: client.ruc,
        'SECTOR P': '',
        DIRECCION: client.address,
        PROVINCIA: client.province || '',
        'DISTRITO FISCAL': client.district || '',
        ZONA: client.zone || '',
      }));

      // 3. Crear el Excel
      const worksheet = xlsx.utils.json_to_sheet(dataToExport);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'CARTERA');

      return xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
      }) as Buffer;
    } catch (error) {
      this.logger.error('Error exportando clientes a Excel', error);
      throw new BadRequestException('No se pudo generar el archivo Excel');
    }
  }

  async exportToExcel(filters: QueryClientDto): Promise<Buffer> {
    try {
      const applyCellStyle = (
        cell: xlsxStyle.CellObject | undefined,
        style: Record<string, unknown>,
      ) => {
        if (cell) {
          cell.s = style;
        }
      };

      const query = this.clientRepository
        .createQueryBuilder('client')
        .leftJoinAndSelect('client.segment', 'segment')
        .leftJoinAndSelect('client.portfolio', 'portfolio')
        .orderBy('client.id', 'ASC');

      // Aplicación de filtros de tu DTO
      if (filters.term) {
        query.andWhere(
          '(client.commercialName ILIKE :term OR client.businessName ILIKE :term OR client.ruc ILIKE :term)',
          { term: `%${filters.term}%` },
        );
      }
      if (filters.segmentId) {
        query.andWhere('client.segmentId = :segmentId', {
          segmentId: filters.segmentId,
        });
      }
      if (filters.portfolioId) {
        query.andWhere('client.portfolioId = :portfolioId', {
          portfolioId: filters.portfolioId,
        });
      }

      const clients = await query.getMany();

      // 1. Crear el libro y una hoja vacía
      const workbook = xlsxStyle.utils.book_new();
      const worksheet = xlsxStyle.utils.json_to_sheet([]); // Iniciamos vacío para controlar las filas

      // 2. Insertar Fila 1: Logo/Texto institucional tal como viene en tu plantilla de importación
      xlsxStyle.utils.sheet_add_aoa(worksheet, [['ACME & CIA', 'CARTERA']], {
        origin: 'A1',
      });

      // Estilo para la celda "ACME & CIA" de la esquina
      applyCellStyle(worksheet['A1'] as xlsxStyle.CellObject | undefined, {
        font: { bold: true, color: { rgb: 'E28743' }, size: 12 },
      });
      applyCellStyle(worksheet['B1'] as xlsxStyle.CellObject | undefined, {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'E28743' } },
      });

      // 3. Preparar los Encabezados de la Fila 3 con sus Estilos de Color (Naranja Corporativo)
      const headers = [
        'ITEM',
        'ANTERIO',
        'ACTUAL',
        'SEGMENTO',
        'RAZON SOCIAL',
        'RUC',
        'SECTOR P',
        'DIRECCION',
        'PROVINCIA',
        'DISTRITO FISCAL',
        'ZONA',
      ];

      // Agregamos la fila de encabezados en A3
      xlsxStyle.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A3' });

      // Aplicamos color naranja de fondo y texto blanco a cada celda de la Fila 3
      const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
      cols.forEach((col) => {
        const cellRef = `${col}3`;
        const cell = worksheet[cellRef] as xlsxStyle.CellObject | undefined;

        applyCellStyle(cell, {
          fill: { fgColor: { rgb: 'F2A134' } }, // Color naranja de tu segunda imagen
          font: { bold: true, color: { rgb: 'FFFFFF' }, size: 10 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'D3D3D3' } },
            bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
          },
        });
      });

      // 4. Mapear y Agregar los Datos Comerciales a partir de la Fila 4 (A4)
      const rowsData = clients.map((client, index) => [
        index + 1,
        'N/C',
        client.portfolio?.code || '',
        client.segment?.code || '',
        client.businessName,
        client.ruc,
        '',
        client.address,
        client.province || '',
        client.district || '',
        client.zone || '',
      ]);

      // Insertamos los registros abajo de la cabecera. skipHeader: true evita que inserte llaves automáticas
      xlsxStyle.utils.sheet_add_aoa(worksheet, rowsData, { origin: 'A4' });

      // 5. Autoajustar el ancho de las columnas para que no se corte el texto
      worksheet['!cols'] = [
        { wch: 6 }, // ITEM
        { wch: 10 }, // ANTERIO
        { wch: 10 }, // ACTUAL
        { wch: 12 }, // SEGMENTO
        { wch: 45 }, // RAZON SOCIAL
        { wch: 15 }, // RUC
        { wch: 10 }, // SECTOR P
        { wch: 40 }, // DIRECCION
        { wch: 15 }, // PROVINCIA
        { wch: 20 }, // DISTRITO FISCAL
        { wch: 12 }, // ZONA
      ];

      xlsxStyle.utils.book_append_sheet(workbook, worksheet, 'CARTERA');

      const excelBuffer = xlsxStyle.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
      }) as Buffer;

      return excelBuffer;
    } catch (error) {
      this.logger.error('Error exportando clientes a Excel', error);
      throw new BadRequestException(
        'No se pudo generar el archivo Excel estructurado',
      );
    }
  }
}
