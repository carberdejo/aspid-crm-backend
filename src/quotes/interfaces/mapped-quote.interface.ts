// Define la estructura de lo que el frontend recibirá
export interface MappedQuote {
  id: number;
  quoteNumber: string;
  amount: number;
  status: string;
  type: string;
  createdAt: Date;
  userId: number;
  clientId: number;
  contactId: number | null;
  collaboratorId: number | null;
  user: {
    id: number;
    codUser: string;
    firstName: string;
    lastName: string;
  };
  client: {
    id: number;
    commercialName: string;
    ruc: string;
    businessName?: string; // Opcional para FindAll, presente en FindOne
    address?: string; // Opcional para FindAll, presente en FindOne
  };
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    position: string;
    phone?: string; // Opcional
  } | null;
  collaborator: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  // Campos del detalle
  description?: string;
  statusReason?: string;
  orderType?: string;
  updatedAt?: Date;
}
