import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { QueryVisitDto } from './dto/query-visit.dto';
import { Visit } from './entities/visit.entity';

import { CommonValidationService } from 'src/common/common-validation.service';
import {
  VisitNotFoundException,
  VisitContactNotBelongToClientException,
  VisitUserNotFoundException,
  VisitClientNotFoundException,
  VisitContactNotFoundException,
} from './exceptions/visit.exceptions';

@Injectable()
export class VisitsService {
  protected readonly logger = new Logger(VisitsService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    private readonly commonValidationService: CommonValidationService,
  ) {}

  async create(createVisitDto: CreateVisitDto) {
    try {
      this.logger.log('Creating new visit...');

      const client = await this.commonValidationService.findClientById(
        createVisitDto.clientId,
      );

      const contact = await this.commonValidationService.findContactClientById(
        createVisitDto.contactId,
      );

      if (contact.clientId !== client.id) {
        throw new VisitContactNotBelongToClientException(
          createVisitDto.contactId,
          createVisitDto.clientId,
        );
      }
      await this.commonValidationService.findUserById(createVisitDto.userId);
      await this.commonValidationService.findDepartmentById(
        createVisitDto.departmentId,
      );

      const visit = this.visitRepository.create(createVisitDto);
      const savedVisit = await this.visitRepository.save(visit);

      this.logger.log(`Visit created successfully with ID: ${savedVisit.id}`);
      return {
        message: 'Visita creada exitosamente',
      };
    } catch (error) {
      this.logger.error(
        `Error creating visit: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
      throw error;
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
      this.logger.error(
        `Error fetching visits: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
      throw error;
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
        throw new VisitNotFoundException(id);
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
      this.logger.error(
        `Error fetching visit: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
      throw error;
    }
  }

  async update(id: number, updateVisitDto: UpdateVisitDto) {
    try {
      this.logger.log(`Updating visit with ID: ${id}`);

      const visit = await this.visitRepository.findOne({ where: { id } });
      if (!visit) {
        throw new VisitNotFoundException(id);
      }

      // Si se está actualizando userId, validar que exista
      if (updateVisitDto.userId) {
        await this.commonValidationService.findUserById(updateVisitDto.userId);
      }

      // Si se está actualizando clientId, validar que exista
      if (updateVisitDto.clientId) {
        await this.commonValidationService.findClientById(
          updateVisitDto.clientId,
        );
      }

      // Si se está actualizando contactId, validar que exista y pertenezca al cliente
      if (updateVisitDto.contactId) {
        const contact =
          await this.commonValidationService.findContactClientById(
            updateVisitDto.contactId,
          );

        const clientIdToCheck = updateVisitDto.clientId || visit.clientId;
        if (contact.clientId !== clientIdToCheck) {
          throw new VisitContactNotBelongToClientException(
            updateVisitDto.contactId,
            clientIdToCheck,
          );
        }
      }

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
      this.logger.error(
        `Error updating visit: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
      throw error;
    }
  }

  async remove(id: number) {
    try {
      this.logger.log(`Removing visit with ID: ${id}`);

      const visit = await this.visitRepository.findOne({ where: { id } });
      if (!visit) throw new VisitNotFoundException(id);

      await this.visitRepository.delete(id);

      return {
        message: 'Visita eliminada exitosamente',
      };
    } catch (error) {
      this.logger.error(
        `Error removing visit: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
      throw error;
    }
  }
}
