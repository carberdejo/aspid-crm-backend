import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DocumentStatus } from 'src/orders/interfaces/document-status.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryInvoiceDto extends PaginationDto {
  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  // Sin filtro se listan vigentes y anuladas
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
