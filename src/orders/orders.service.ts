import { Injectable, Logger } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/order.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { User } from 'src/users/entities';
import { PurchaseOrderMapper } from './mappers/orders.mapper';
import { PurchaseOrderNotFoundException } from './exceptions/order.exceptions';

// Una OC no tiene dueño ni área propios: los hereda de su cotización
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    private readonly commonValidationService: CommonValidationService,
    private readonly accessScopeService: AccessScopeService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPoDto: CreatePurchaseOrderDto, currentUser: User) {
    const quote = await this.commonValidationService.validateQuoteAprobed(
      createPoDto.quoteId,
    );

    // Generar la OC aprueba la cotización: solo su dueño o un admin (el colaborador no)
    this.accessScopeService.assertCanModify(
      quote,
      currentUser,
      'la cotización',
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // La OC y el cambio de estado de la cotización se guardan en la misma transacción
      const newPo = queryRunner.manager.create(PurchaseOrder, createPoDto);
      const savedPo = await queryRunner.manager.save(newPo);

      await queryRunner.manager.update(Quote, createPoDto.quoteId, {
        status: QuoteStatus.APROBADO,
        statusReason: `Se ha aprobado y generado la orden de compra con número ${savedPo.poNumber}`,
      });
      await queryRunner.commitTransaction();
      return {
        message: `Se ha aprobado y generado la orden de compra con número ${savedPo.poNumber}`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryDto: QueryPurchaseOrderDto, currentUser: User) {
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
      billingStatus,
    } = queryDto;
    const queryBuilder = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.quote', 'quote')
      .leftJoin('quote.client', 'client')
      .leftJoin('po.invoices', 'invoice')
      .select([
        'po.id',
        'po.poNumber',
        'po.receivedAt',
        'quote.quoteNumber',
        'client.commercialName',
        'client.ruc',
        'po.billingStatus',
        'po.amount',
        'po.currency',
        'invoice.id',
        'invoice.amount',
      ]);

    // Alcance obligatorio a través de la cotización: un user ve las OC de sus
    // cotizaciones (o donde es colaborador) en sus áreas; admin ve todo
    this.accessScopeService.applyScope(queryBuilder, 'quote', currentUser, {
      readerFields: ['collaboratorId'],
    });

    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('po.poNumber ILIKE :term', { term: `%${term}%` })
            .orWhere('quote.quoteNumber ILIKE :term', { term: `%${term}%` })
            .orWhere('client.commercialName ILIKE :term', {
              term: `%${term}%`,
            });
        }),
      );
    }
    if (queryDto.departmentId) {
      queryBuilder.andWhere('quote.departmentId = :departmentId', {
        departmentId,
      });
    }
    if (queryDto.clientId) {
      queryBuilder.andWhere('quote.clientId = :clientId', { clientId });
    }
    if (queryDto.userId) {
      queryBuilder.andWhere('quote.userId = :userId', { userId });
    }

    if (billingStatus && billingStatus.length > 0) {
      queryBuilder.andWhere('po.billingStatus IN (:...billingStatus)', {
        billingStatus,
      });
    }

    if (startDate)
      queryBuilder.andWhere('po.receivedAt >= :startDate', { startDate });

    if (endDate)
      queryBuilder.andWhere('po.receivedAt <= :endDate', { endDate });

    const [items, total] = await queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('po.id', order)
      .getManyAndCount();

    return {
      items: items.map((po) => PurchaseOrderMapper.toListResponse(po)),
      total,
      limit,
      offset,
    };
  }

  async findOne(id: number, currentUser: User) {
    const po = await this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.quote', 'quote')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.contact', 'contact')
      .leftJoinAndSelect('quote.user', 'user') // Vendedor que creó la cotización
      .where('po.id = :id', { id })
      .getOne();

    if (!po) throw new PurchaseOrderNotFoundException(id);

    this.accessScopeService.assertCanRead(
      { ...po.quote, id: po.id },
      currentUser,
      'la orden de compra',
      [po.quote.collaboratorId],
    );

    return PurchaseOrderMapper.toResponse(po);
  }

  // update(id: number, updateOrderDto: UpdateOrderDto) {
  //   return `This action updates a #${id} order`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} order`;
  // }
}
