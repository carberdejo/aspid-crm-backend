import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryIndustrySegmentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  term?: string; // Para buscar por nombre o código

  @IsOptional()
  @IsString()
  isActive?: boolean; // Para filtrar solo activos (opcional)
}
