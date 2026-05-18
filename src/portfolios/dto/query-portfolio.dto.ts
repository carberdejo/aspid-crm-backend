import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryPortfolioDto extends PaginationDto {
  @IsOptional()
  @IsString()
  term?: string; // Para buscar por nombre o código
}
