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

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly commonValidationService: CommonValidationService,
    private dataSource: DataSource, // Para manejar la transacción
  ) {}
  async create(createInvoiceDto: CreateInvoiceDto) {
    const { orderId, amount, invoiceNumber, issueDate, currency } =
      createInvoiceDto;
    const order =
      await this.commonValidationService.validatePurchaseOrder(orderId);

    const totalAmount = order.amount;
    console.log({ totalAmount });
    const previousInvoices = await this.invoiceRepository.find({
      where: { orderId },
    });
    const alreadyInvoiced = previousInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0,
    );
    console.log({ alreadyInvoiced });
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
        billingStatus: newStatus as BillingStatus,
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

  async findAll(queryDto: QueryInvoiceDto) {
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

  async findOne(id: number) {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('order.client', 'client')
      .select([
        'invoice.id',
        'invoice.invoiceNumber',
        'invoice.amount',
        'invoice.issueDate',
        'order.poNumber',
      ])
      .where('invoice.id = :id', { id });
    const invoice = await queryBuilder.getOne();
    if (!invoice) throw new InvoiceNotFoundException(id);

    return invoice;
  }

  // update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
  //   return `This action updates a #${id} invoice`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} invoice`;
  // }
}
