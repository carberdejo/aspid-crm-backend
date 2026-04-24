import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryVisitDto extends PaginationDto {
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
