import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BillingStatus } from '../interfaces/billing-status.enum';

export class QueryPurchaseOrderDto extends PaginationDto {
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

  @IsOptional()
  @Transform(({ value }: { value: unknown }): BillingStatus[] => {
    const validStatuses = new Set(Object.values(BillingStatus));
    const isBillingStatus = (item: unknown): item is BillingStatus =>
      typeof item === 'string' && validStatuses.has(item as BillingStatus);

    if (Array.isArray(value)) {
      return value.filter(isBillingStatus);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(isBillingStatus);
    }

    return [];
  })
  @IsArray()
  @IsEnum(BillingStatus, { each: true })
  billingStatus?: BillingStatus[];
}
