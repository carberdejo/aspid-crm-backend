import { Type } from 'class-transformer';
import { IsOptional, IsDateString, IsNumber } from 'class-validator';
export class VisitMetricsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId: number;
}
