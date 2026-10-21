import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryDeliveryDto extends PaginationDto {
  // Busca por razón social, nombre comercial o RUC del cliente
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
}
