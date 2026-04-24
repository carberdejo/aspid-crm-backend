import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtra por nombre o apellido (búsqueda parcial)',
    example: 'Carlos',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filtra por el código único de usuario (exacto)',
    example: '001',
  })
  @IsOptional()
  @IsString()
  codUser?: string;
}
