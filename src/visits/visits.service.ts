import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { QueryVisitDto } from './dto/query-visit.dto';
import { Visit } from './entities/visit.entity';

import { CommonValidationService } from 'src/common/common-validation.service';
import {
  VisitNotFoundException,
  VisitContactNotBelongToClientException,
} from './exceptions/visit.exceptions';
import { VisitMapper } from './mappers/visits.mapper';

@Injectable()
export class VisitsService {
  protected readonly logger = new Logger(VisitsService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    private readonly commonValidationService: CommonValidationService,
  ) {}

  async create(createVisitDto: CreateVisitDto) {
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
  }

  async findAll(queryVisitDto: QueryVisitDto) {
    const {
      limit = 10,
      offset = 0,
      clientId,
      userId,
      departmentId,
      startDate,
      endDate,
      term,
    } = queryVisitDto;
    console.log('--- DEBUG FILTROS ---');
    console.log('Valor crudo de startDate:', queryVisitDto.startDate);
    console.log('Tipo de dato de startDate:', typeof queryVisitDto.startDate);

    console.log('Valor crudo de endDate:', queryVisitDto.endDate);
    console.log('Tipo de dato de endDate:', typeof queryVisitDto.endDate);

    const queryBuilder = this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.user', 'user')
      .leftJoinAndSelect('visit.client', 'client') // Cargamos relaciones básicas
      .leftJoinAndSelect('visit.contact', 'contact');

    // Filtros Dinámicos (Mejorado para legibilidad)
    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('visit.visitTopics ILike :term', { term: `%${term}%` })
            .orWhere('visit.outcomeSummary ILike :term', { term: `%${term}%` })
            .orWhere('client.commercialName ILike :term', { term: `%${term}%` })
            .orWhere('contact.firstName ILike :term', { term: `%${term}%` })
            .orWhere('contact.lastName ILike :term', { term: `%${term}%` });
        }),
      );
    }
    if (clientId)
      queryBuilder.andWhere('visit.clientId = :clientId', { clientId });

    if (userId) queryBuilder.andWhere('visit.userId = :userId', { userId });

    if (departmentId)
      queryBuilder.andWhere('visit.departmentId = :departmentId', {
        departmentId,
      });

    if (startDate)
      queryBuilder.andWhere('visit.date >= :startDate', { startDate });

    if (endDate) queryBuilder.andWhere('visit.date <= :endDate', { endDate });

    const [visits, total] = await queryBuilder
      .orderBy('visit.date', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    this.logger.log(`Fetched ${visits.length} visits with filters applied`);
    return {
      data: {
        items: VisitMapper.toManyResponse(visits), // <--- USO DEL MAPPER
        total,
        limit,
        offset,
      },
    };
  }

  async findOne(id: number) {
    this.logger.log(`Fetching visit with ID: ${id}`);

    const visit = await this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.user', 'user')
      .leftJoin('visit.client', 'client')
      .leftJoin('visit.contact', 'contact')
      .where('visit.id = :id', { id })
      .getOne();

    if (!visit) throw new VisitNotFoundException(id);

    this.logger.log(`Visit retrieved successfully`);
    return VisitMapper.toResponse(visit, true);
  }

  async update(id: number, updateVisitDto: UpdateVisitDto) {
    this.logger.log(`Updating visit with ID: ${id}`);

    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) throw new VisitNotFoundException(id);

    // Si se está actualizando userId, validar que exista
    if (updateVisitDto.userId)
      await this.commonValidationService.findUserById(updateVisitDto.userId);

    // Si se está actualizando clientId, validar que exista
    if (updateVisitDto.clientId)
      await this.commonValidationService.findClientById(
        updateVisitDto.clientId,
      );

    // Si se está actualizando contactId, validar que exista y pertenezca al cliente
    if (updateVisitDto.contactId) {
      const contact = await this.commonValidationService.findContactClientById(
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
    const updatedVisitResponse = await this.findOne(id);

    return {
      message: 'Visita actualizada exitosamente',
      data: updatedVisitResponse,
    };
  }

  async remove(id: number) {
    this.logger.log(`Removing visit with ID: ${id}`);

    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) throw new VisitNotFoundException(id);

    await this.visitRepository.delete(id);

    return {
      message: 'Visita eliminada exitosamente',
    };
  }
}
