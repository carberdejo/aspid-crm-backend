import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, Min } from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'Fecha de inicio para filtrar visitas (formato ISO8601)',
    type: Date,
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de inicio debe ser una fecha válida (ISO8601)' })
  @Type(() => Date) // Convierte el string de la URL a un objeto Date de JS
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de fin para filtrar visitas (formato ISO8601)',
    type: Date,
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de fin debe ser una fecha válida (ISO8601)' })
  @Type(() => Date)
  endDate?: Date;
}
