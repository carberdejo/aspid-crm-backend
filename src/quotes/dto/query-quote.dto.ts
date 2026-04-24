import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryQuoteDto extends PaginationDto {
  quoteNumber?: string;
  clientId?: number;
  userId?: number;
  contactId?: number;
  departmentId?: number;
  status?: string;
  type?: string;
  orderType?: string;
  collaboratorId?: number;
}
