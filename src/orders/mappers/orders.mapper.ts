import { PurchaseOrder } from '../entities/order.entity';

export class PurchaseOrderMapper {
  static toResponse(po: PurchaseOrder) {
    return {
      id: Number(po.id),
      poNumber: po.poNumber,
      receivedAt: po.receivedAt,
      billingStatus: po.billingStatus,
      amount: po.amount,
      currency: po.currency,
      status: po.status,
      annulledAt: po.annulledAt,
      annulReason: po.annulReason,
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
    // 1. Sumamos de forma segura los montos de las facturas (la consulta solo trae las vigentes)
    const totalInvoiced =
      po.invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

    // 2. Restamos el total facturado del monto original de la OC
    const remaining = Number(po.amount) - totalInvoiced;
    const remainingAmount = Math.max(0, Number(remaining.toFixed(2)));

    // 3. Cálculo del porcentaje de avance (redondeado a entero para la UI)
    const billingPercentage =
      Number(po.amount) > 0
        ? Math.min(100, Math.round((totalInvoiced / Number(po.amount)) * 100))
        : 0;
    // Versión ligera para la tabla
    return {
      id: Number(po.id),
      poNumber: po.poNumber,
      receivedAt: po.receivedAt,
      quoteNumber: po.quote?.quoteNumber,
      clientName: po.quote?.client?.commercialName,
      ruc: po.quote?.client?.ruc,
      billingStatus: po.billingStatus,
      amount: po.amount,
      currency: po.currency,
      status: po.status,
      annulledAt: po.annulledAt,
      annulReason: po.annulReason,
      // Dueño de la cotización: el frontend lo usa para mostrar editar/anular
      userId: po.quote?.userId,
      // Campos de seguimiento de facturación
      invoicedAmount: Number(totalInvoiced.toFixed(2)),
      remainingAmount: remainingAmount,
      billingPercentage: billingPercentage,
    };
  }
}
