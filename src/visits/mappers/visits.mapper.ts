import { Visit } from '../entities/visit.entity';

export class VisitMapper {
  static toResponse(visit: Visit, isDetail = false) {
    return {
      id: visit.id,
      date: visit.date,
      visitTopics: visit.visitTopics,
      outcomeSummary: visit.outcomeSummary,
      departmentId: visit.departmentId,
      userId: visit.userId,
      clientId: visit.clientId,
      contactId: visit.contactId,
      user: {
        id: visit.user.id,
        codUser: visit.user.codUser,
        firstName: visit.user.firstName,
        lastName: visit.user.lastName,
        ...(isDetail && { email: visit.user.email }), // Solo en detalle
      },
      client: {
        id: visit.client.id,
        commercialName: visit.client.commercialName,
        ruc: visit.client.ruc,
        ...(isDetail && {
          businessName: visit.client.businessName,
          address: visit.client.address,
        }),
      },
      contact: visit.contact
        ? {
            id: visit.contact.id,
            firstName: visit.contact.firstName,
            lastName: visit.contact.lastName,
            position: visit.contact.position,
            ...(isDetail && { phone: visit.contact.phone }),
          }
        : null,
    };
  }

  static toManyResponse(visits: Visit[]) {
    return visits.map((visit) => this.toResponse(visit, false));
  }
}
