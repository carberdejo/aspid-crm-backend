import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryPurchaseOrderDto extends PaginationDto {
  @IsOptional()
  @IsString()
  term?: string; // Para buscar por po_number o número de cotización vinculada
}
