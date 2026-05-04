import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Role } from '../interfaces';

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtra por el código, nombre o apellido (búsqueda parcial)',
    example: '001',
  })
  @IsOptional()
  @IsString()
  term?: string; // Busca en nombre, apellido y código

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  // @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;
}
