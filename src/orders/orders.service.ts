import { Injectable, Logger } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AnnulDocumentDto } from './dto/annul-document.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/order.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { uniqueViolationConstraint } from 'src/common/helpers/unique-violation.helper';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { QuoteInvalidStatusTransitionException } from 'src/quotes/exceptions/quote.exceptions';
import { User } from 'src/users/entities';
import { PurchaseOrderMapper } from './mappers/orders.mapper';
import {
  OrderAmountBelowInvoicedException,
  OrderAnnulledException,
  OrderHasActiveInvoicesException,
  PoNumberAlreadyExistsException,
  PurchaseOrderNotFoundException,
  QuoteHasActiveOrderException,
} from './exceptions/order.exceptions';
import { DocumentStatus } from './interfaces/document-status.enum';
import { computeBillingStatus, toCents } from './billing-status.util';
import { lockOrderWithQuote, sumActiveInvoices } from './order-billing.helpers';

const RESOURCE_LABEL = 'la orden de compra';

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
    const quote = await this.commonValidationService.findQuoteById(
      createPoDto.quoteId,
    );

    // Generar la OC aprueba la cotización: solo su dueño o un admin (el colaborador no)
    this.accessScopeService.assertCanModify(
      quote,
      currentUser,
      'la cotización',
    );
    this.assertQuoteCanGetOrder(quote);

    try {
      // La OC y el cambio de estado de la cotización se guardan en la misma transacción
      const savedPo = await this.dataSource.transaction(async (manager) => {
        // Se bloquea la cotización y se revalida: dos OC simultáneas para la misma
        // cotización se ejecutan una tras otra y la segunda ya la ve APROBADO
        const locked = await manager.findOneOrFail(Quote, {
          where: { id: createPoDto.quoteId },
          lock: { mode: 'pessimistic_write' },
        });
        this.assertQuoteCanGetOrder(locked);

        const po = await manager.save(
          manager.create(PurchaseOrder, {
            ...createPoDto,
            // Sin moneda indicada, la OC toma la de su cotización
            currency: createPoDto.currency ?? quote.currency,
          }),
        );

        await manager.update(Quote, createPoDto.quoteId, {
          status: QuoteStatus.APROBADO,
          statusReason: `Se ha aprobado y generado la orden de compra con número ${po.poNumber}`,
        });
        return po;
      });

      this.logger.log(`PO ${savedPo.id} created for quote ${quote.id}`);
      return {
        message: `Se ha aprobado y generado la orden de compra con número ${savedPo.poNumber}`,
      };
    } catch (err) {
      throw this.translateUniqueViolation(
        err,
        createPoDto.poNumber,
        quote.quoteNumber,
      );
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
      status,
    } = queryDto;
    const queryBuilder = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.quote', 'quote')
      .leftJoin('quote.client', 'client')
      // Lo facturado solo cuenta las facturas vigentes
      .leftJoin('po.invoices', 'invoice', 'invoice.status = :activeStatus', {
        activeStatus: DocumentStatus.VIGENTE,
      })
      .select([
        'po.id',
        'po.poNumber',
        'po.receivedAt',
        'po.status',
        'po.annulledAt',
        'po.annulReason',
        'quote.id',
        'quote.quoteNumber',
        'quote.userId',
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

    if (status) queryBuilder.andWhere('po.status = :status', { status });

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
      RESOURCE_LABEL,
      [po.quote.collaboratorId],
    );

    return PurchaseOrderMapper.toResponse(po);
  }

  /**
   * Edita número, fecha, monto o moneda de una OC vigente.
   * - El monto no puede quedar por debajo de lo facturado; el estado de facturación se recalcula.
   * - La moneda solo cambia si la OC no tiene facturas vigentes (están en su moneda).
   */
  async update(id: number, updateDto: UpdateOrderDto, currentUser: User) {
    this.logger.log(`Updating PO ${id}`);

    try {
      await this.dataSource.transaction(async (manager) => {
        const { po, quote } = await lockOrderWithQuote(manager, id);

        // Solo el dueño de la cotización o un admin (el colaborador no)
        this.accessScopeService.assertCanModify(
          { ...quote, id: po.id },
          currentUser,
          RESOURCE_LABEL,
        );
        if (po.status === DocumentStatus.ANULADA)
          throw new OrderAnnulledException(po.poNumber);

        const invoiced = await sumActiveInvoices(manager, id);

        if (
          updateDto.currency &&
          updateDto.currency !== po.currency &&
          invoiced > 0
        ) {
          throw new OrderHasActiveInvoicesException(
            po.poNumber,
            'cambiar la moneda de',
          );
        }

        const finalAmount = updateDto.amount ?? po.amount;
        if (toCents(finalAmount) < toCents(invoiced)) {
          throw new OrderAmountBelowInvoicedException(
            Number(finalAmount),
            invoiced,
          );
        }

        manager.merge(PurchaseOrder, po, updateDto);
        po.billingStatus = computeBillingStatus(finalAmount, invoiced);
        await manager.save(po);
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, updateDto.poNumber);
    }

    this.logger.log(`PO ${id} updated by user ${currentUser.id}`);
    return {
      message: 'Orden de compra actualizada exitosamente',
      data: await this.findOne(id, currentUser),
    };
  }

  /**
   * Anula una OC sin facturas vigentes. La cotización vuelve a PENDIENTE para que se
   * pueda corregir y generar otra OC (o rechazarla).
   */
  async annul(id: number, annulDto: AnnulDocumentDto, currentUser: User) {
    this.logger.log(`Annulling PO ${id}`);

    const poNumber = await this.dataSource.transaction(async (manager) => {
      const { po, quote } = await lockOrderWithQuote(manager, id);

      this.accessScopeService.assertCanModify(
        { ...quote, id: po.id },
        currentUser,
        RESOURCE_LABEL,
      );
      if (po.status === DocumentStatus.ANULADA)
        throw new OrderAnnulledException(po.poNumber);

      if ((await sumActiveInvoices(manager, id)) > 0)
        throw new OrderHasActiveInvoicesException(po.poNumber, 'anular');

      await manager.update(PurchaseOrder, id, {
        status: DocumentStatus.ANULADA,
        annulledAt: () => 'CURRENT_TIMESTAMP',
        annulledBy: currentUser.id,
        annulReason: annulDto.annulReason,
      });

      await manager.update(Quote, quote.id, {
        status: QuoteStatus.PENDIENTE,
        statusReason: `Orden de compra ${po.poNumber} anulada: ${annulDto.annulReason}`,
      });
      return po.poNumber;
    });

    this.logger.log(`PO ${id} annulled by user ${currentUser.id}`);
    return {
      message: `La orden de compra ${poNumber} fue anulada y su cotización volvió a PENDIENTE`,
    };
  }

  // Solo una cotización PENDIENTE genera OC: si está APROBADO ya tiene una vigente
  private assertQuoteCanGetOrder(quote: Quote) {
    const status = quote.status as QuoteStatus;
    if (status === QuoteStatus.APROBADO)
      throw new QuoteHasActiveOrderException(quote.quoteNumber);
    if (status !== QuoteStatus.PENDIENTE)
      throw new QuoteInvalidStatusTransitionException(
        quote.status,
        QuoteStatus.APROBADO,
      );
  }

  // Una carrera que la validación previa no ve llega como violación de índice único
  private translateUniqueViolation(
    err: unknown,
    poNumber?: string,
    quoteNumber?: string,
  ) {
    const constraint = uniqueViolationConstraint(err);
    if (constraint === 'uk_po_number_active' && poNumber)
      return new PoNumberAlreadyExistsException(poNumber);
    if (constraint === 'uk_po_active_quote' && quoteNumber)
      return new QuoteHasActiveOrderException(quoteNumber);
    return err;
  }
}
