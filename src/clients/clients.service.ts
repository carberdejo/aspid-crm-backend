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

    // FILTERS
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

      // SOLUCIÓN 1: Saltar las filas del logo.
      // range: 2 significa que ignorará las filas 0 y 1 (las del logo) y usará la fila 2 (la 3 en Excel) como encabezados.
      const rawData: Record<string, unknown>[] = xlsx.utils.sheet_to_json(
        worksheet,
        {
          range: 2,
          defval: null, // Si una celda está vacía, devuelve null en vez de ignorarla
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

      const existingClients = await this.clientRepository.find({
        select: ['ruc'],
      });
      const existingRucsSet = new Set(existingClients.map((c) => c.ruc));

      // 3. Variables para el Reporte
      const clientsToInsert: Partial<Client>[] = [];
      const skippedDuplicates: string[] = [];
      const errorsRow: { row: number; reason: string }[] = [];

      // 4. Transformación de la Data
      for (let i = 0; i < rawData.length; i++) {
        const originalRow = rawData[i];

        // SOLUCIÓN 2: Normalizar las llaves del Excel (Quitar espacios extra en "RUC " o "RAZON SOCIAL ")
        const row: Record<string, unknown> = {};
        for (const key in originalRow) {
          row[key.trim().toUpperCase()] = originalRow[key];
        }

        // Ahora buscamos con total seguridad
        const ruc = getCellText(row['RUC']);
        const businessName = getCellText(row['RAZON SOCIAL']);

        // Validación obligatoria
        if (!ruc || !businessName) {
          // +4 porque index 0 + 1, y nos saltamos 2 filas de logo = Fila real en Excel es i+4
          errorsRow.push({ row: i + 4, reason: 'Falta RUC o Razón Social' });
          continue;
        }

        // Validar duplicado en memoria
        if (existingRucsSet.has(ruc)) {
          skippedDuplicates.push(ruc);
          continue;
        }

        // Búsqueda en los Hash Maps
        const portfolioCode = getCellText(row['ACTUAL'])?.toUpperCase();
        // Cubrimos por si en el Excel dice "SEGMENT", "SEGMENTO" o "SEGMENTO INDUSTRIAL"
        const segmentCode = (
          getCellText(row['SEGMENTO']) || getCellText(row['SEGMENT'])
        )?.toUpperCase();

        const clientObj: Partial<Client> = {
          ruc: ruc,
          businessName: businessName,
          commercialName: businessName,
          address: getCellText(row['DIRECCION']) || '',
          province: getCellText(row['PROVINCIA']),
          district: getCellText(row['DISTRITO FISCAL']),
          zone: getCellText(row['ZONA']),

          // Asignación de relaciones
          portfolioId: portfolioCode
            ? portfolioMap.get(portfolioCode)
            : undefined,
          segmentId: segmentCode ? segmentMap.get(segmentCode) : undefined,
        };

        clientsToInsert.push(clientObj);
        existingRucsSet.add(ruc);
      }

      // 5. Inserción por Lotes
      const chunkSize = 500;
      let insertedCount = 0;

      for (let i = 0; i < clientsToInsert.length; i += chunkSize) {
        const chunk = clientsToInsert.slice(i, i + chunkSize);
        // Usamos save en lugar de insert para que TypeORM maneje mejor los nulos si hay Default values
        await this.clientRepository.save(chunk);
        insertedCount += chunk.length;
      }

      // 6. Retornar el Reporte
      return {
        message: 'Proceso de importación finalizado',
        stats: {
          totalRowsProcessed: rawData.length,
          successfullyInserted: insertedCount,
          skippedDuplicatesCount: skippedDuplicates.length,
          errorsCount: errorsRow.length,
        },
        details: {
          skippedRucs: skippedDuplicates,
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
}
