import {
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
      .addSelect(['segment.id', 'segment.code'])
      .leftJoin('client.portfolio', 'portfolio')
      .addSelect(['portfolio.id', 'portfolio.code']);

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
    data: Pick<RucResponse, 'ruc' | 'razonSocial' | 'direccion'>;
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
}
