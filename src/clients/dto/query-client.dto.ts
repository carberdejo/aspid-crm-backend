import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryClientDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Filtra por el nombre o RUC del cliente (búsqueda parcial, case-insensitive)',
    example: 'Andina',
  })
  @IsOptional()
  @IsString()
  term?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  portfolioId: number; // Para filtrar clientes por cartera (control de accesos)

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  segmentId: number; // Para filtrar clientes por segmento industrial

  @ApiPropertyOptional({
    description:
      'Solo admin: lista los clientes que puede usar ese usuario (p. ej. al registrar a su nombre). Un user no puede usarlo: se ignora',
    example: 5,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  userId?: number;
}
