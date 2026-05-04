import { Quote } from '../entities/quote.entity';
import { MappedQuote } from '../interfaces/mapped-quote.interface';
import { QuoteCurrency } from '../interfaces/quote-currency.enum';

export class QuoteMapper {
  static toResponse(quote: Quote, isDetail: boolean = false) {
    const response: MappedQuote = {
      id: Number(quote.id),
      quoteNumber: quote.quoteNumber,
      amount: Number(quote.amount),
      currency: quote.currency as QuoteCurrency,
      status: quote.status,
      type: quote.type,
      createdAt: quote.createdAt,
      userId: Number(quote.userId),
      clientId: Number(quote.clientId),
      departmentId: Number(quote.departmentId),
      contactId: quote.contactId ? Number(quote.contactId) : null,
      collaboratorId: quote.collaboratorId
        ? Number(quote.collaboratorId)
        : null,

      user: {
        id: Number(quote.user.id),
        codUser: quote.user.codUser,
        firstName: quote.user.firstName,
        lastName: quote.user.lastName,
      },
      client: {
        id: Number(quote.client.id),
        commercialName: quote.client.commercialName,
        ruc: quote.client.ruc,
      },
      contact: quote.contact
        ? {
            id: Number(quote.contact.id),
            firstName: quote.contact.firstName,
            lastName: quote.contact.lastName,
            position: quote.contact.position,
          }
        : null,
      collaborator: quote.collaborator
        ? {
            id: Number(quote.collaborator.id),
            firstName: quote.collaborator.firstName,
            lastName: quote.collaborator.lastName,
          }
        : null,
    };

    // Campos adicionales solo para el Detalle (FindOne)
    if (isDetail) {
      response.description = quote.description;
      response.statusReason = quote.statusReason;
      response.orderType = quote.orderType;
      response.updatedAt = quote.updatedAt;

      // Expandimos info del cliente
      response.client = {
        ...response.client,
        businessName: quote.client?.businessName,
        address: quote.client?.address,
      };

      // Agregamos el teléfono del contacto solo en el detalle
      if (quote.contact && response.contact) {
        response.contact = {
          ...response.contact,
          phone: quote.contact.phone,
        };
      }
    }

    return response;
  }
}
