import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { QueryVisitDto } from './dto/query-visit.dto';
import { Visit } from './entities/visit.entity';

import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { User } from 'src/users/entities';
import {
  VisitNotFoundException,
  VisitContactNotBelongToClientException,
} from './exceptions/visit.exceptions';
import { VisitMapper } from './mappers/visits.mapper';

const RESOURCE_LABEL = 'la visita';

@Injectable()
export class VisitsService {
  protected readonly logger = new Logger(VisitsService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    private readonly commonValidationService: CommonValidationService,
    private readonly accessScopeService: AccessScopeService,
  ) {}

  async create(createVisitDto: CreateVisitDto, currentUser: User) {
    this.logger.log('Creating new visit...');

    // Dueño efectivo: el del token para un user; el indicado (validado) para un admin
    const userId = await this.accessScopeService.resolveOwner(
      currentUser,
      createVisitDto.departmentId,
      createVisitDto.userId,
    );

    const client = await this.commonValidationService.findClientById(
      createVisitDto.clientId,
    );

    const contact = await this.commonValidationService.findContactClientById(
      createVisitDto.contactId,
    );

    if (Number(contact.clientId) !== Number(client.id)) {
      throw new VisitContactNotBelongToClientException(
        createVisitDto.contactId,
        createVisitDto.clientId,
      );
    }

    const visit = this.visitRepository.create({ ...createVisitDto, userId });
    const savedVisit = await this.visitRepository.save(visit);

    this.logger.log(`Visit created successfully with ID: ${savedVisit.id}`);
    return {
      message: 'Visita creada exitosamente',
    };
  }

  async findAll(queryVisitDto: QueryVisitDto, currentUser: User) {
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

    const queryBuilder = this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.user', 'user')
      .leftJoinAndSelect('visit.client', 'client') // Cargamos relaciones básicas
      .leftJoinAndSelect('visit.contact', 'contact');

    // Alcance obligatorio: un user solo ve sus visitas en sus áreas (admin ve todo)
    this.accessScopeService.applyScope(queryBuilder, 'visit', currentUser);

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

  async findOne(id: number, currentUser: User) {
    this.logger.log(`Fetching visit with ID: ${id}`);

    const visit = await this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.user', 'user')
      .leftJoinAndSelect('visit.client', 'client')
      .leftJoinAndSelect('visit.contact', 'contact')
      .where('visit.id = :id', { id })
      .getOne();

    if (!visit) throw new VisitNotFoundException(id);

    this.accessScopeService.assertCanRead(visit, currentUser, RESOURCE_LABEL);

    this.logger.log(`Visit retrieved successfully`);
    return VisitMapper.toResponse(visit, true);
  }

  async update(id: number, updateVisitDto: UpdateVisitDto, currentUser: User) {
    this.logger.log(`Updating visit with ID: ${id}`);

    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) throw new VisitNotFoundException(id);

    this.accessScopeService.assertCanModify(visit, currentUser, RESOURCE_LABEL);

    // Si la edición cambia el dueño o el área, se revalidan con las mismas reglas que al crear
    const ownerId = await this.accessScopeService.resolveOwnerOnUpdate(
      currentUser,
      visit,
      updateVisitDto,
    );
    const changes: UpdateVisitDto =
      ownerId === undefined
        ? updateVisitDto
        : { ...updateVisitDto, userId: ownerId };

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
      if (Number(contact.clientId) !== Number(clientIdToCheck)) {
        throw new VisitContactNotBelongToClientException(
          updateVisitDto.contactId,
          clientIdToCheck,
        );
      }
    }

    await this.visitRepository.update(id, changes);

    // Obtener la visita actualizada con relaciones (sin incluir contacts del cliente)
    const updatedVisitResponse = await this.findOne(id, currentUser);

    return {
      message: 'Visita actualizada exitosamente',
      data: updatedVisitResponse,
    };
  }

  async remove(id: number, currentUser: User) {
    this.logger.log(`Removing visit with ID: ${id}`);

    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) throw new VisitNotFoundException(id);

    this.accessScopeService.assertCanModify(visit, currentUser, RESOURCE_LABEL);

    await this.visitRepository.delete(id);

    return {
      message: 'Visita eliminada exitosamente',
    };
  }
}
