import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { QueryVisitDto } from './dto/query-visit.dto';
import { Visit } from './entities/visit.entity';
import { User } from '../users/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { ContactClient } from '../clients/entities/contact-client.entity';
import { ApiException } from 'src/common/exceptions/api.exception';
import { Department } from 'src/departments/entities/department.entity';

@Injectable()
export class VisitsService {
  protected readonly logger = new Logger(VisitsService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ContactClient)
    private readonly contactClientRepository: Repository<ContactClient>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createVisitDto: CreateVisitDto) {
    try {
      this.logger.log('Creating new visit...');

      // Validar que el usuario exista
      const user = await this.userRepository.findOne({
        where: { id: createVisitDto.userId },
      });
      if (!user) {
        throw new ApiException(
          404,
          `Usuario con ID ${createVisitDto.userId} no encontrado`,
          [],
          HttpStatus.NOT_FOUND,
        );
      }

      // Validar que el cliente exista
      const client = await this.clientRepository.findOne({
        where: { id: createVisitDto.clientId },
      });
      if (!client) {
        throw new ApiException(
          404,
          `Cliente con ID ${createVisitDto.clientId} no encontrado`,
          [],
          HttpStatus.NOT_FOUND,
        );
      }

      // Validar que el contacto exista
      if (createVisitDto.contactId) {
        const contact = await this.contactClientRepository.findOne({
          where: { id: createVisitDto.contactId },
        });
        if (!contact) {
          throw new ApiException(
            404,
            `Contacto con ID ${createVisitDto.contactId} no encontrado`,
            [],
            HttpStatus.NOT_FOUND,
          );
        }
        this.logger.log(
          `Contacto con userId ${contact.clientId} encontrado, mi clienteId es ${client.id}`,
        );
        // Validar que el contacto pertenezca al cliente
        if (contact.clientId !== client.id) {
          throw new ApiException(
            400,
            `El contacto con ID ${createVisitDto.contactId} no pertenece al cliente con ID ${createVisitDto.clientId}`,
            [],
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Validar que el departamento exista
      const department = await this.departmentRepository.findOne({
        where: { id: createVisitDto.departmentId },
      });
      if (!department) {
        throw new ApiException(
          404,
          `Departamento con ID ${createVisitDto.departmentId} no encontrado`,
          [],
          HttpStatus.NOT_FOUND,
        );
      }

      // Crear y guardar la visita
      const visit = this.visitRepository.create(createVisitDto);
      const savedVisit = await this.visitRepository.save(visit);

      this.logger.log(`Visit created successfully with ID: ${savedVisit.id}`);
      return {
        message: 'Visita creada exitosamente',
        data: savedVisit,
      };
    } catch (error) {
      if (error instanceof ApiException) throw error;

      this.logger.error(`Error creating visit: ${error.message}`);
      throw new ApiException(
        500,
        'Error al crear la visita',
        [error.message],
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(queryVisitDto: QueryVisitDto) {
    const { limit = 10, offset = 0 } = queryVisitDto;
    try {
      this.logger.log('Fetching visits with filters...');

      const queryBuilder: SelectQueryBuilder<Visit> = this.visitRepository
        .createQueryBuilder('visit')
        .leftJoinAndSelect('visit.user', 'user')
        .leftJoin('visit.client', 'client')
        .addSelect(['client.id', 'client.commercialName', 'client.ruc'])
        .leftJoin('visit.contact', 'contact')
        .addSelect([
          'contact.id',
          'contact.firstName',
          'contact.lastName',
          'contact.position',
        ]);

      // Aplicar filtro por clientId
      if (queryVisitDto.clientId) {
        queryBuilder.andWhere('visit.client_id = :clientId', {
          clientId: queryVisitDto.clientId,
        });
      }

      // Aplicar filtro por userId
      if (queryVisitDto.userId) {
        queryBuilder.andWhere('visit.user_id = :userId', {
          userId: queryVisitDto.userId,
        });
      }

      // Aplicar filtro por departmentId
      if (queryVisitDto.departmentId) {
        queryBuilder.andWhere('visit.department_id = :departmentId', {
          departmentId: queryVisitDto.departmentId,
        });
      }

      // Aplicar filtro de fecha inicial (heredado de PaginationDto)
      if (queryVisitDto.startDate) {
        queryBuilder.andWhere('visit.date >= :startDate', {
          startDate: queryVisitDto.startDate,
        });
      }

      // Aplicar filtro de fecha final (heredado de PaginationDto)
      if (queryVisitDto.endDate) {
        queryBuilder.andWhere('visit.date <= :endDate', {
          endDate: queryVisitDto.endDate,
        });
      }

      // Ordenar por fecha descendente
      queryBuilder.orderBy('visit.date', 'DESC');

      // Aplicar paginación
      queryBuilder.limit(limit);
      queryBuilder.offset(+offset);

      // Obtener resultados y total
      const [visits, total] = await queryBuilder.getManyAndCount();

      // Mapear a respuesta optimizada
      const optimizedVisits = visits.map((visit) => ({
        id: visit.id,
        date: visit.date,
        visitTopics: visit.visitTopics,
        outcomeSummary: visit.outcomeSummary,
        departmentId: visit.departmentId,
        userId: visit.userId,
        clientId: visit.clientId,
        contactId: visit.contactId,
        user: {
          id: visit.user.id,
          codUser: visit.user.codUser,
          firstName: visit.user.firstName,
          lastName: visit.user.lastName,
        },
        client: {
          id: visit.client.id,
          commercialName: visit.client.commercialName,
          ruc: visit.client.ruc,
        },
        contact: visit.contact
          ? {
              id: visit.contact.id,
              firstName: visit.contact.firstName,
              lastName: visit.contact.lastName,
              position: visit.contact.position,
            }
          : null,
      }));

      this.logger.log(`Retrieved ${visits.length} visits`);
      return {
        data: {
          items: optimizedVisits,
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching visits: ${error.message}`);
      throw new ApiException(
        500,
        'Error al obtener las visitas',
        [error.message],
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number) {
    try {
      this.logger.log(`Fetching visit with ID: ${id}`);

      const visit = await this.visitRepository
        .createQueryBuilder('visit')
        .leftJoinAndSelect('visit.user', 'user')
        .leftJoin('visit.client', 'client')
        .addSelect([
          'client.id',
          'client.commercialName',
          'client.businessName',
          'client.ruc',
          'client.address',
        ])
        .leftJoin('visit.contact', 'contact')
        .addSelect([
          'contact.id',
          'contact.firstName',
          'contact.lastName',
          'contact.position',
          'contact.phone',
        ])
        .where('visit.id = :id', { id })
        .getOne();

      if (!visit) {
        throw new ApiException(
          404,
          `Visita con ID ${id} no encontrada`,
          [],
          HttpStatus.NOT_FOUND,
        );
      }

      // Mapear a respuesta optimizada
      const optimizedVisit = {
        id: visit.id,
        userId: visit.userId,
        clientId: visit.clientId,
        contactId: visit.contactId,
        departmentId: visit.departmentId,
        date: visit.date,
        visitTopics: visit.visitTopics,
        outcomeSummary: visit.outcomeSummary,
        user: {
          id: visit.user.id,
          codUser: visit.user.codUser,
          firstName: visit.user.firstName,
          lastName: visit.user.lastName,
          email: visit.user.email,
        },
        client: {
          id: visit.client.id,
          commercialName: visit.client.commercialName,
          businessName: visit.client.businessName,
          ruc: visit.client.ruc,
          address: visit.client.address,
        },
        contact: visit.contact
          ? {
              id: visit.contact.id,
              firstName: visit.contact.firstName,
              lastName: visit.contact.lastName,
              position: visit.contact.position,
              phone: visit.contact.phone,
            }
          : null,
      };

      this.logger.log(`Visit retrieved successfully`);
      return {
        message: 'Visita obtenida exitosamente',
        data: optimizedVisit,
      };
    } catch (error) {
      if (error instanceof ApiException) throw error;

      this.logger.error(`Error fetching visit: ${error.message}`);
      throw new ApiException(
        500,
        'Error al obtener la visita',
        [error.message],
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: number, updateVisitDto: UpdateVisitDto) {
    try {
      this.logger.log(`Updating visit with ID: ${id}`);

      // Verificar que la visita exista
      const visit = await this.visitRepository.findOne({ where: { id } });
      if (!visit) {
        throw new ApiException(
          404,
          `Visita con ID ${id} no encontrada`,
          [],
          HttpStatus.NOT_FOUND,
        );
      }

      // Si se está actualizando userId, validar que exista
      if (updateVisitDto.userId) {
        const user = await this.userRepository.findOne({
          where: { id: updateVisitDto.userId },
        });
        if (!user) {
          throw new ApiException(
            404,
            `Usuario con ID ${updateVisitDto.userId} no encontrado`,
            [],
            HttpStatus.NOT_FOUND,
          );
        }
      }

      // Si se está actualizando clientId, validar que exista
      if (updateVisitDto.clientId) {
        const client = await this.clientRepository.findOne({
          where: { id: updateVisitDto.clientId },
        });
        if (!client) {
          throw new ApiException(
            404,
            `Cliente con ID ${updateVisitDto.clientId} no encontrado`,
            [],
            HttpStatus.NOT_FOUND,
          );
        }
      }

      // Si se está actualizando contactId, validar que exista y pertenezca al cliente
      if (updateVisitDto.contactId) {
        const contact = await this.contactClientRepository.findOne({
          where: { id: updateVisitDto.contactId },
        });
        if (!contact) {
          throw new ApiException(
            404,
            `Contacto con ID ${updateVisitDto.contactId} no encontrado`,
            [],
            HttpStatus.NOT_FOUND,
          );
        }

        // Validar que el contacto pertenezca al cliente correcto
        const clientIdToCheck = updateVisitDto.clientId || visit.clientId;
        if (contact.clientId !== clientIdToCheck) {
          throw new ApiException(
            400,
            `El contacto con ID ${updateVisitDto.contactId} no pertenece al cliente especificado`,
            [],
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Actualizar la visita
      await this.visitRepository.update(id, updateVisitDto);

      // Obtener la visita actualizada con relaciones (sin incluir contacts del cliente)
      const updatedVisit = await this.visitRepository
        .createQueryBuilder('visit')
        .leftJoinAndSelect('visit.user', 'user')
        .leftJoin('visit.client', 'client')
        .addSelect([
          'client.id',
          'client.commercialName',
          'client.businessName',
          'client.ruc',
          'client.address',
          'client.createdAt',
        ])
        .leftJoinAndSelect('visit.contact', 'contact')
        .where('visit.id = :id', { id })
        .getOne();

      return {
        message: 'Visita actualizada exitosamente',
        data: updatedVisit,
      };
    } catch (error) {
      if (error instanceof ApiException) throw error;

      this.logger.error(`Error updating visit: ${error.message}`);
      throw new ApiException(
        500,
        'Error al actualizar la visita',
        [error.message],
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: number) {
    try {
      this.logger.log(`Removing visit with ID: ${id}`);

      const visit = await this.visitRepository.findOne({ where: { id } });
      if (!visit) {
        throw new ApiException(
          404,
          `Visita con ID ${id} no encontrada`,
          [],
          HttpStatus.NOT_FOUND,
        );
      }

      await this.visitRepository.delete(id);

      return {
        message: 'Visita eliminada exitosamente',
      };
    } catch (error) {
      if (error instanceof ApiException) throw error;

      this.logger.error(`Error removing visit: ${error.message}`);
      throw new ApiException(
        500,
        'Error al eliminar la visita',
        [error.message],
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
