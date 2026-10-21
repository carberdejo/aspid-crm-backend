import { Type } from 'class-transformer';
import { IsOptional, IsDateString, IsNumber } from 'class-validator';

/** Filtros comunes a todas las métricas */
export class MetricsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** Solo lo respeta el admin: un user siempre ve sus propias métricas */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;

  /** Área a medir. Un user solo puede pedir sus propias áreas */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;
}
