// Interfaces para respuestas de findAll (optimizadas)
export interface UserSummary {
  id: number | string;
  codUser: string;
  firstName: string;
  lastName?: string;
}

export interface ClientSummary {
  id: number | string;
  commercialName: string;
  ruc?: string;
}

export interface ContactSummary {
  id: number | string;
  firstName: string;
  lastName?: string;
  position?: string;
}

export interface VisitListItem {
  id: number | string;
  date: Date;
  visitTopics: string;
  outcomeSummary: string;
  departmentId: number;
  userId: number | string;
  clientId: number | string;
  contactId: number | string;
  user: UserSummary;
  client: ClientSummary;
  contact: ContactSummary | null;
}

export interface VisitListResponse {
  data: {
    items: VisitListItem[];
    total: number;
    limit: number;
    offset: number;
  };
}

// Interfaces para respuestas individuales (detalladas)
export interface UserDetail {
  id: number | string;
  codUser: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ClientDetail {
  id: number | string;
  commercialName: string;
  businessName: string;
  ruc: string;
  address: string;
}

export interface ContactDetail {
  id: number | string;
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
}

export interface VisitDetail {
  id: number | string;
  userId: number | string;
  clientId: number | string;
  contactId: number | string | null;
  departmentId: number;
  date: Date;
  visitTopics: string;
  outcomeSummary: string;
  user: UserDetail;
  client: ClientDetail;
  contact: ContactDetail | null;
}

export interface VisitDetailResponse {
  message: string;
  data: VisitDetail;
}

// Interfaces antiguas (mantener compatibilidad)
export interface VisitResponse {
  message: string;
  data?: any;
}

export interface PaginatedVisitResponse {
  message: string;
  data: any[];
  total: number;
  limit?: number;
  offset?: number;
}
