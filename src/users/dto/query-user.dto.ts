import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
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
  // @Transform(({ value }) => {
  //   if (value === 'true') return true;
  //   if (value === 'false') return false;
  //   return undefined; // Si no es ninguno, se queda como opcional
  // })
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;
}
