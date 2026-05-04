import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryVisitDto extends PaginationDto {
  @IsOptional()
  @IsString()
  term?: string; // Búsqueda en temas, resumen, cliente o usuario

  @ApiPropertyOptional({
    description: 'Filtrar por ID del cliente',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID del usuario',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID del departamento',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;
}
