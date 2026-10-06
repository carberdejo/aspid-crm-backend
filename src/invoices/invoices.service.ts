import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Brackets, DataSource, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { CommonValidationService } from 'src/common/common-validation.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { BillingStatus } from 'src/orders/interfaces/billing-status.enum';
import { InvoiceNotFoundException } from './exceptions/invoice.exceptions';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { InvoiceMapper } from './mappers/invoice.mapper';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { User } from 'src/users/entities';

// Una factura no tiene dueño ni área propios: los hereda de OC → cotización
@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly commonValidationService: CommonValidationService,
    private readonly accessScopeService: AccessScopeService,
    private dataSource: DataSource, // Para manejar la transacción
  ) {}
  async create(createInvoiceDto: CreateInvoiceDto, currentUser: User) {
    const { orderId, amount, invoiceNumber, issueDate, currency } =
      createInvoiceDto;
    const order =
      await this.commonValidationService.validatePurchaseOrder(orderId);

    // Facturar modifica la OC: solo el dueño de la cotización o un admin
    this.accessScopeService.assertCanModify(
      { ...order.quote, id: order.id },
      currentUser,
      'la orden de compra',
    );

    const totalAmount = order.amount;
    const previousInvoices = await this.invoiceRepository.find({
      where: { orderId },
    });
    const alreadyInvoiced = previousInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0,
    );
    const newTotal = alreadyInvoiced + amount;
    if (newTotal > totalAmount) {
      throw new BadRequestException(
        `El monto excede el total de la cotización. Restante: ${totalAmount - alreadyInvoiced}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Guardar la factura
      const newInvoice = this.invoiceRepository.create({
        orderId,
        invoiceNumber,
        amount,
        issueDate,
        currency,
      });
      await queryRunner.manager.save(newInvoice);

      // Actualizar el estado de la OC
      let newStatus = BillingStatus.FACTURADO_PARCIAL;
      if (Math.abs(newTotal - totalAmount) < 0.01) {
        // Evitamos problemas de precisión decimal
        newStatus = BillingStatus.FACTURADO_COMPLETO;
      }

      await queryRunner.manager.update(PurchaseOrder, orderId, {
        billingStatus: newStatus,
      });

      await queryRunner.commitTransaction();
      return {
        message: `Factura con nro ${createInvoiceDto.invoiceNumber} creada exitosamente`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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
        'quote.id',
        'quote.quoteNumber',
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

  // update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
  //   return `This action updates a #${id} invoice`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} invoice`;
  // }
}
