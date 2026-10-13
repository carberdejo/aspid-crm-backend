import { Injectable, Logger } from '@nestjs/common';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity';
import { Brackets, DeepPartial, Repository } from 'typeorm';
import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ClientAccessService } from 'src/common/access/client-access.service';
import { User } from 'src/users/entities';
import { DeliveryNotFoundException } from './exceptions/delivery.exceptions';

const RESOURCE_LABEL = 'la entrega';

@Injectable()
export class DeliverysService {
  protected readonly logger = new Logger(DeliverysService.name);

  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    private readonly validationService: CommonValidationService,
    private readonly accessScopeService: AccessScopeService,
    private readonly clientAccessService: ClientAccessService,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto, currentUser: User) {
    // Dueño efectivo: el del token para un user; el indicado (validado) para un admin
    const userId = await this.accessScopeService.resolveOwner(
      currentUser,
      createDeliveryDto.departmentId,
      createDeliveryDto.userId,
    );

    // El cliente es opcional: 0 o ausente se guarda como NULL
    const clientId = createDeliveryDto.clientId || null;
    if (clientId) {
      const client = await this.validationService.findClientById(clientId);
      // El cliente debe ser accesible para el dueño (el empleado, aunque registre un admin)
      await this.clientAccessService.assertOwnerCanAccessClient(
        currentUser,
        userId,
        client,
      );
    }

    const delivery = this.deliveryRepository.create({
      ...createDeliveryDto,
      clientId,
      userId,
    });
    await this.deliveryRepository.save(delivery);

    this.logger.log(`Delivery ${delivery.id} created by user ${userId}`);
    return {
      message: 'Entrega registrada exitosamente',
      deliveryId: delivery.id,
    };
  }

  async findAll(queryDto: QueryDeliveryDto, currentUser: User) {
    const {
      limit = 10,
      offset = 0,
      term,
      departmentId,
      clientId,
      userId,
      order,
      startDate,
      endDate,
    } = queryDto;

    const queryBuilder = this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoin('delivery.client', 'client')
      .leftJoin('delivery.user', 'user')
      .select([
        'delivery.id',
        'delivery.departmentId',
        'delivery.deliveryDate',
        'delivery.deliveryItems',
        'client.id',
        'client.businessName',
        'client.ruc',
        'user.id',
        'user.firstName',
        'user.lastName',
      ]);

    // Alcance obligatorio: un user ve sus entregas en sus áreas (y las antiguas sin área)
    this.accessScopeService.applyScope(queryBuilder, 'delivery', currentUser, {
      includeWithoutDepartment: true,
    });

    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('client.businessName ILIKE :term', { term: `%${term}%` })
            .orWhere('client.commercialName ILIKE :term', { term: `%${term}%` })
            .orWhere('client.ruc ILIKE :term', { term: `%${term}%` });
        }),
      );
    }

    if (departmentId)
      queryBuilder.andWhere('delivery.departmentId = :departmentId', {
        departmentId,
      });

    if (clientId)
      queryBuilder.andWhere('delivery.clientId = :clientId', { clientId });

    if (userId) queryBuilder.andWhere('delivery.userId = :userId', { userId });

    if (startDate)
      queryBuilder.andWhere('delivery.deliveryDate >= :startDate', {
        startDate,
      });

    if (endDate)
      queryBuilder.andWhere('delivery.deliveryDate <= :endDate', { endDate });

    const [items, total] = await queryBuilder
      .orderBy('delivery.deliveryDate', order)
      .addOrderBy('delivery.id', order)
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { data: { items, total, limit, offset } };
  }

  async findOne(id: number, currentUser: User) {
    const delivery = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoin('delivery.client', 'client')
      .leftJoin('delivery.user', 'user')
      .select([
        'delivery.id',
        'delivery.userId',
        'delivery.departmentId',
        'delivery.clientId',
        'delivery.deliveryDate',
        'delivery.deliveryItems',
        'delivery.createdAt',
        'delivery.updatedAt',
        'client.id',
        'client.businessName',
        'client.ruc',
        'user.id',
        'user.firstName',
        'user.lastName',
      ])
      .where('delivery.id = :id', { id })
      .getOne();

    if (!delivery) throw new DeliveryNotFoundException(id);

    this.accessScopeService.assertCanRead(
      delivery,
      currentUser,
      RESOURCE_LABEL,
    );

    return delivery;
  }

  async update(
    id: number,
    updateDeliveryDto: UpdateDeliveryDto,
    currentUser: User,
  ) {
    const delivery = await this.deliveryRepository.findOneBy({ id });
    if (!delivery) throw new DeliveryNotFoundException(id);

    this.accessScopeService.assertCanModify(
      delivery,
      currentUser,
      RESOURCE_LABEL,
    );

    // Si la edición cambia el dueño o el área, se revalidan con las mismas reglas que al crear
    const ownerId = await this.accessScopeService.resolveOwnerOnUpdate(
      currentUser,
      delivery,
      updateDeliveryDto,
    );

    const changes: DeepPartial<Delivery> = { ...updateDeliveryDto };
    if (ownerId !== undefined) changes.userId = ownerId;
    if (updateDeliveryDto.clientId !== undefined)
      changes.clientId = updateDeliveryDto.clientId || null;

    // Si cambia el cliente o el dueño, el cliente final (si hay) debe ser accesible para el dueño final
    const finalOwnerId = ownerId ?? Number(delivery.userId);
    const finalClientId =
      changes.clientId !== undefined ? changes.clientId : delivery.clientId;
    if (
      finalClientId &&
      (updateDeliveryDto.clientId !== undefined ||
        finalOwnerId !== Number(delivery.userId))
    ) {
      const client = await this.validationService.findClientById(
        Number(finalClientId),
      );
      await this.clientAccessService.assertOwnerCanAccessClient(
        currentUser,
        finalOwnerId,
        client,
      );
    }

    await this.deliveryRepository.save(
      this.deliveryRepository.merge(delivery, changes),
    );

    return {
      message: 'Entrega actualizada exitosamente',
      data: await this.findOne(id, currentUser),
    };
  }

  async remove(id: number, currentUser: User) {
    const delivery = await this.deliveryRepository.findOneBy({ id });
    if (!delivery) throw new DeliveryNotFoundException(id);

    this.accessScopeService.assertCanModify(
      delivery,
      currentUser,
      RESOURCE_LABEL,
    );

    await this.deliveryRepository.remove(delivery);
    return {
      message: 'Entrega eliminada exitosamente',
      deliveryId: id,
    };
  }
}
