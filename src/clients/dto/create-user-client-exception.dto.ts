import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserClientExceptionDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  userId: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  clientId: number;

  @IsString()
  @IsOptional()
  notes?: string;

  // 🚩 NOTA DE ARQUITECTURA:
  // Fíjate que NO pedimos el `grantedById` aquí.
  // Ese dato NO debe venir del frontend por seguridad.
  // Lo debes extraer del Token JWT del administrador en el Controlador (req.user.id).
}
