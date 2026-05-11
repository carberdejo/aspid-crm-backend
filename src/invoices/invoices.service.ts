import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { CommonValidationService } from 'src/common/common-validation.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { BillingStatus } from 'src/orders/interfaces/billing-status.enum';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly commonValidationService: CommonValidationService,
    private dataSource: DataSource, // Para manejar la transacción
  ) {}
  async create(createInvoiceDto: CreateInvoiceDto) {
    const { orderId, amount, invoiceNumber, issueDate } = createInvoiceDto;
    const order =
      await this.commonValidationService.validatePurchaseOrder(orderId);

    const totalAmount = order.quote.amount;
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
        message: 'Factura creada exitosamente',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all invoices`;
  }

  findOne(id: number) {
    return `This action returns a #${id} invoice`;
  }

  // update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
  //   return `This action updates a #${id} invoice`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} invoice`;
  // }
}
