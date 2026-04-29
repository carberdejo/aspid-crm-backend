import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RemoveQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  statusReason: string;
}
