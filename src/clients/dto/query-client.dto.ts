import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryClientDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Filtra por el nombre o RUC del cliente (búsqueda parcial, case-insensitive)',
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  term?: string;
}
