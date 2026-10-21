import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Motivo para anular una orden de compra o una factura */
export class AnnulDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  annulReason: string;
}
