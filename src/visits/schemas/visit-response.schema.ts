export const VisitResponseSchemas = {
  create: {
    example: {
      message: 'Visita creada exitosamente',
      data: {
        id: 1,
        userId: 1,
        clientId: 1,
        contactId: 1,
        date: '2024-03-15',
        visitTopics: 'Discusión de renovación de contrato',
        outcomeSummary: 'Contrato renovado exitosamente',
      },
    },
  },

  findAll: {
    example: {
      data: {
        items: [
          {
            id: 7,
            date: '2026-04-15',
            visitTopics: 'dfdfdf',
            outcomeSummary: 'dfdfdfdf',
            departmentId: 1,
            userId: 4,
            clientId: 1,
            contactId: 3,
            user: {
              id: 4,
              codUser: '2026002',
              firstName: 'Carlos',
              lastName: 'Berdejo',
            },
            client: {
              id: 1,
              commercialName: 'ACME Soluciones',
              ruc: '20544699939',
            },
            contact: {
              id: 3,
              firstName: 'JOSE',
              lastName: 'ROJAS',
              position: 'GERENTE',
            },
          },
          {
            id: 6,
            date: '2026-04-15',
            visitTopics: 'gdgdkdkk',
            outcomeSummary: 'ghjgjghjh',
            departmentId: 1,
            userId: 4,
            clientId: 1,
            contactId: 1,
            user: {
              id: 4,
              codUser: '2026002',
              firstName: 'Carlos',
              lastName: 'Berdejo',
            },
            client: {
              id: 1,
              commercialName: 'ACME Soluciones',
              ruc: '20544699939',
            },
            contact: {
              id: 1,
              firstName: 'Juan',
              lastName: 'Pérez',
              position: 'Gerente de Compras',
            },
          },
        ],
        total: 6,
        limit: 10,
        offset: 0,
      },
    },
  },

  findOne: {
    example: {
      message: 'Visita obtenida exitosamente',
      data: {
        id: 5,
        userId: 4,
        clientId: 1,
        contactId: 1,
        departmentId: 1,
        date: '2024-03-15',
        visitTopics: 'concretar una cotizacion',
        outcomeSummary: 'cotizacion lograda',
        user: {
          id: 4,
          codUser: '2026002',
          firstName: 'Carlos',
          lastName: 'Berdejo',
          email: 'carlos.berdejo@concar.com',
        },
        client: {
          id: 1,
          commercialName: 'ACME Soluciones',
          businessName: 'ACME & CIA S.A.C',
          ruc: '20544699939',
          address: 'Av. Las Camelias 123, San Isidro',
        },
        contact: {
          id: 1,
          firstName: 'Juan',
          lastName: 'Pérez',
          position: 'Gerente de Compras',
          phone: '987654321',
        },
      },
    },
  },

  update: {
    example: {
      message: 'Visita actualizada exitosamente',
      data: {
        id: 1,
        userId: 1,
        clientId: 1,
        contactId: 1,
        date: '2024-03-15',
        visitTopics: 'Discusión de renovación de contrato',
        outcomeSummary: 'Contrato renovado exitosamente - Actualizado',
      },
    },
  },

  remove: {
    example: {
      message: 'Visita eliminada exitosamente',
    },
  },
};
