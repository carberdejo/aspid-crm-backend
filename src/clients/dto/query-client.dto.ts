import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryClientDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Filtra clientes por nombre comercial o razón social (búsqueda parcial)',
    example: 'ACME',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filtra por coincidencia parcial del RUC',
    example: '20123456789',
  })
  @IsOptional()
  @IsString()
  ruc?: string;
}
