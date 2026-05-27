import { PurchaseOrder } from '../entities/order.entity';

export class PurchaseOrderMapper {
  static toResponse(po: PurchaseOrder) {
    return {
      id: Number(po.id),
      poNumber: po.poNumber,
      receivedAt: po.receivedAt,
      billingStatus: po.billingStatus,
      // Información de la Cotización
      quote: {
        id: Number(po.quote?.id),
        number: po.quote?.quoteNumber,
        amount: po.quote?.amount,
        currency: po.quote?.currency,
        status: po.quote?.status,
        statusReason: po.quote?.statusReason,
        createdAt: po.quote?.createdAt,
      },
      // Información del Cliente (Directo de la relación con Quote)
      client: {
        id: po.quote?.client?.id,
        name: po.quote?.client?.commercialName,
        ruc: po.quote?.client?.ruc,
      },
      // Información del Contacto
      contact: po.quote?.contact
        ? {
            id: po.quote.contact.id,
            fullName: `${po.quote.contact.firstName} ${po.quote.contact.lastName}`,
            position: po.quote.contact.position,
          }
        : null,
      user: {
        id: po.quote?.user?.id,
        name: `${po.quote.user.firstName} ${po.quote.user.lastName}`, // Suponiendo que tu user tiene name
      },
    };
  }

  static toListResponse(po: PurchaseOrder) {
    // Versión ligera para la tabla
    return {
      id: Number(po.id),
      poNumber: po.poNumber,
      receivedAt: po.receivedAt,
      quoteNumber: po.quote?.quoteNumber,
      clientName: po.quote?.client?.commercialName,
      ruc: po.quote?.client?.ruc,
      billingStatus: po.billingStatus,
    };
  }
}
