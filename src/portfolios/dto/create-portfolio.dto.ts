import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { PortfolioUserItemDto } from './portfolio-user-item.dto';

export class CreatePortfolioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[C][0-9]+$/, { message: 'El formato debe ser C1, C2, etc.' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  zone?: string;

  // NUEVO: Arreglo de usuarios anidado
  @IsArray()
  @IsOptional() // Puede que creen la cartera vacía inicialmente
  @ValidateNested({ each: true })
  @Type(() => PortfolioUserItemDto) // Importante para que class-validator entre al sub-objeto
  users?: PortfolioUserItemDto[];
}
