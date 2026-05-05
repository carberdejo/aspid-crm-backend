import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsNumber, IsOptional, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Limite de resultados por página',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Número de página (offset)',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ type: String, example: '2026-04-30' })
  @IsOptional()
  @IsISO8601({}, { message: 'Formato de fecha inválido (YYYY-MM-DD)' })
  startDate?: string;

  @ApiPropertyOptional({ type: String, example: '2026-04-30' })
  @IsOptional()
  @IsISO8601({}, { message: 'Formato de fecha inválido (YYYY-MM-DD)' })
  endDate?: string;
}
