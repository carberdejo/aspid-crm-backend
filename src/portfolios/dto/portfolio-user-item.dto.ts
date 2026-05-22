import { IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { PortfolioRole } from '../interfaces/portfolio-role.enum';

// DTO para validar cada usuario del arreglo
export class PortfolioUserItemDto {
  @IsNumber()
  @IsNotEmpty({ message: 'El id del usuario es obligatorio' })
  userId: number;

  @IsEnum(PortfolioRole, {
    message: 'El rol debe ser RESPONSABLE, ING_PROYECTOS o SERVICIOS',
  })
  roleInPortfolio: PortfolioRole;
}
