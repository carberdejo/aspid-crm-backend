import { Injectable, Logger } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { AnnulDocumentDto } from 'src/orders/dto/annul-document.dto';
import { DocumentStatus } from 'src/orders/interfaces/document-status.enum';
import { OrderAnnulledException } from 'src/orders/exceptions/order.exceptions';
import { computeBillingStatus, toCents } from 'src/orders/billing-status.util';
import {
  lockOrderWithQuote,
  sumActiveInvoices,
} from 'src/orders/order-billing.helpers';
import {
  InvoiceAmountExceedsOrderException,
  InvoiceAnnulledException,
  InvoiceCurrencyMismatchException,
  InvoiceNotFoundException,
  InvoiceNumberAlreadyExistsException,
} from './exceptions/invoice.exceptions';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { InvoiceMapper } from './mappers/invoice.mapper';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { uniqueViolationConstraint } from 'src/common/helpers/unique-violation.helper';
import { User } from 'src/users/entities';

const RESOURCE_LABEL = 'la orden de compra';

// Una factura no tiene dueño ni área propios: los hereda de OC → cotización
@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly accessScopeService: AccessScopeService,
    private dataSource: DataSource, // Para manejar la transacción
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, currentUser: User) {
    const { orderId, amount, invoiceNumber, issueDate, currency } =
      createInvoiceDto;

    try {
      await this.dataSource.transaction(async (manager) => {
        // La OC queda bloqueada hasta el final: dos facturas simultáneas no pueden
        // pasarse del total de la orden
        const { po } = await this.lockModifiableOrder(
          manager,
          orderId,
          currentUser,
        );

        // La factura va en la moneda de su OC (si no se indica, se toma la de la OC)
        if (currency && currency !== po.currency)
          throw new InvoiceCurrencyMismatchException(currency, po.currency);

        const invoiced = await sumActiveInvoices(manager, orderId);
        const remainingCents = toCents(po.amount) - toCents(invoiced);
        if (toCents(amount) > remainingCents)
          throw new InvoiceAmountExceedsOrderException(
            amount,
            remainingCents / 100,
          );

        await manager.save(
          manager.create(Invoice, {
            orderId,
            invoiceNumber,
            amount,
            issueDate,
            currency: po.currency,
          }),
        );

        await manager.update(PurchaseOrder, orderId, {
          billingStatus: computeBillingStatus(po.amount, invoiced + amount),
        });
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, invoiceNumber);
    }

    this.logger.log(`Invoice ${invoiceNumber} created for PO ${orderId}`);
    return {
      message: `Factura con nro ${invoiceNumber} creada exitosamente`,
    };
  }

  async findAll(queryDto: QueryInvoiceDto, currentUser: User) {
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
      status,
    } = queryDto;
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.order', 'order')
      .leftJoin('order.quote', 'quote')
      .leftJoin('quote.client', 'client')
      .select([
        'invoice.id',
        'invoice.invoiceNumber',
        'invoice.amount',
        'invoice.currency',
        'invoice.issueDate',
        'invoice.status',
        'invoice.annulledAt',
        'invoice.annulReason',
        'quote.id',
        'quote.quoteNumber',
        'quote.userId',
        'order.id',
        'order.poNumber',
        'client.id',
        'client.businessName',
        'client.ruc',
      ]);

    // Alcance obligatorio a través de la cotización: un user ve las facturas de sus
    // cotizaciones (o donde es colaborador) en sus áreas; admin ve todo
    this.accessScopeService.applyScope(queryBuilder, 'quote', currentUser, {
      readerFields: ['collaboratorId'],
    });

    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('order.poNumber ILIKE :term', { term: `%${term}%` })
            .orWhere('quote.quoteNumber ILIKE :term', { term: `%${term}%` })
            .orWhere('invoice.invoiceNumber ILIKE :term', { term: `%${term}%` })
            .orWhere('client.businessName ILIKE :term', {
              term: `%${term}%`,
            });
        }),
      );
    }

    if (queryDto.departmentId)
      queryBuilder.andWhere('quote.departmentId = :departmentId', {
        departmentId,
      });

    if (queryDto.clientId)
      queryBuilder.andWhere('quote.clientId = :clientId', { clientId });

    if (queryDto.userId)
      queryBuilder.andWhere('quote.userId = :userId', { userId });

    if (status) queryBuilder.andWhere('invoice.status = :status', { status });

    if (startDate)
      queryBuilder.andWhere('invoice.issueDate >= :startDate', { startDate });

    if (endDate)
      queryBuilder.andWhere('invoice.issueDate <= :endDate', { endDate });

    const [items, total] = await queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('invoice.issueDate', order)
      .getManyAndCount();

    return {
      items: items.map((invoice) => InvoiceMapper.toListResponse(invoice)),
      total,
      limit,
      offset,
    };
  }

  async findOne(id: number, currentUser: User) {
    // La OC no tiene relación directa con el cliente: se llega a él por la cotización
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.order', 'order')
      .leftJoin('order.quote', 'quote')
      .leftJoin('quote.client', 'client')
      .select([
        'invoice.id',
        'invoice.invoiceNumber',
        'invoice.amount',
        'invoice.currency',
        'invoice.issueDate',
        'invoice.status',
        'invoice.annulledAt',
        'invoice.annulReason',
        'order.id',
        'order.poNumber',
        'quote.id',
        'quote.quoteNumber',
        'quote.userId',
        'quote.departmentId',
        'quote.collaboratorId',
        'client.id',
        'client.businessName',
        'client.ruc',
      ])
      .where('invoice.id = :id', { id });
    const invoice = await queryBuilder.getOne();
    if (!invoice) throw new InvoiceNotFoundException(id);

    this.accessScopeService.assertCanRead(
      { ...invoice.order.quote, id: invoice.id },
      currentUser,
      'la factura',
      [invoice.order.quote.collaboratorId],
    );

    return invoice;
  }

  /**
   * Edita número, fecha o monto de una factura vigente. El nuevo monto, sumado a las
   * demás facturas vigentes, no puede pasar el total de la OC.
   */
  async update(id: number, updateDto: UpdateInvoiceDto, currentUser: User) {
    this.logger.log(`Updating invoice ${id}`);

    try {
      await this.dataSource.transaction(async (manager) => {
        const { invoice, po } = await this.lockInvoice(
          manager,
          id,
          currentUser,
        );

        const others = await sumActiveInvoices(manager, po.id, id);
        const finalAmount = updateDto.amount ?? Number(invoice.amount);
        const remainingCents = toCents(po.amount) - toCents(others);
        if (toCents(finalAmount) > remainingCents)
          throw new InvoiceAmountExceedsOrderException(
            finalAmount,
            remainingCents / 100,
          );

        manager.merge(Invoice, invoice, updateDto);
        await manager.save(invoice);

        await manager.update(PurchaseOrder, po.id, {
          billingStatus: computeBillingStatus(po.amount, others + finalAmount),
        });
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, updateDto.invoiceNumber);
    }

    this.logger.log(`Invoice ${id} updated by user ${currentUser.id}`);
    return {
      message: 'Factura actualizada exitosamente',
      data: await this.findOne(id, currentUser),
    };
  }

  /**
   * Anula una factura: deja de contar en lo facturado y la OC recalcula su estado.
   * Su número queda reservado.
   */
  async annul(id: number, annulDto: AnnulDocumentDto, currentUser: User) {
    this.logger.log(`Annulling invoice ${id}`);

    const invoiceNumber = await this.dataSource.transaction(async (manager) => {
      const { invoice, po } = await this.lockInvoice(manager, id, currentUser);

      await manager.update(Invoice, id, {
        status: DocumentStatus.ANULADA,
        annulledAt: () => 'CURRENT_TIMESTAMP',
        annulledBy: currentUser.id,
        annulReason: annulDto.annulReason,
      });

      const remaining = await sumActiveInvoices(manager, po.id, id);
      await manager.update(PurchaseOrder, po.id, {
        billingStatus: computeBillingStatus(po.amount, remaining),
      });
      return invoice.invoiceNumber;
    });

    this.logger.log(`Invoice ${id} annulled by user ${currentUser.id}`);
    return {
      message: `La factura ${invoiceNumber} fue anulada exitosamente`,
    };
  }

  /**
   * Bloquea la OC de la factura y valida que se pueda modificar: OC vigente y
   * usuario dueño de la cotización o admin (el colaborador no)
   */
  private async lockModifiableOrder(
    manager: EntityManager,
    orderId: number,
    currentUser: User,
  ) {
    const locked = await lockOrderWithQuote(manager, orderId);
    this.accessScopeService.assertCanModify(
      { ...locked.quote, id: locked.po.id },
      currentUser,
      RESOURCE_LABEL,
    );
    if (locked.po.status === DocumentStatus.ANULADA)
      throw new OrderAnnulledException(locked.po.poNumber);
    return locked;
  }

  /**
   * Bloquea la OC de una factura vigente y la vuelve a leer ya con el bloqueo, para
   * no trabajar sobre una versión que otra petición acaba de anular o editar
   */
  private async lockInvoice(
    manager: EntityManager,
    id: number,
    currentUser: User,
  ) {
    const found = await manager.findOne(Invoice, { where: { id } });
    if (!found) throw new InvoiceNotFoundException(id);

    const { po } = await this.lockModifiableOrder(
      manager,
      found.orderId,
      currentUser,
    );

    const invoice = await manager.findOneOrFail(Invoice, { where: { id } });
    if (invoice.status === DocumentStatus.ANULADA)
      throw new InvoiceAnnulledException(invoice.invoiceNumber);
    return { invoice, po };
  }

  // El número de factura es único (aunque esté anulada): una carrera llega como
  // violación del índice uk_invoice_number
  private translateUniqueViolation(err: unknown, invoiceNumber?: string) {
    if (uniqueViolationConstraint(err) === 'uk_invoice_number' && invoiceNumber)
      return new InvoiceNumberAlreadyExistsException(invoiceNumber);
    return err;
  }
}
