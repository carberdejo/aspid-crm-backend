import { Invoice } from '../entities/invoice.entity';

export class InvoiceMapper {
  static toListResponse(invoice: Invoice) {
    return {
      id: Number(invoice.id),
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      // Aseguramos los 2 decimales exactos
      amount: Number(Number(invoice.amount).toFixed(2)),
      currency: invoice.currency,

      // Aplanamos la data relacional
      poNumber: invoice.order?.poNumber,
      quoteNumber: invoice.order?.quote?.quoteNumber,
      businessName: invoice.order?.quote?.client?.businessName,
      ruc: invoice.order?.quote?.client?.ruc,
    };
  }
}
