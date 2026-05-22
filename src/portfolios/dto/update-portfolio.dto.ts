import { PartialType } from '@nestjs/swagger';
import { CreatePortfolioDto } from './create-portfolio.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePortfolioDto extends PartialType(CreatePortfolioDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Permite activar/desactivar la cartera sin eliminarla
}
