import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DeliveryItemDto {
  @IsString()
  @IsNotEmpty()
  producto: string;

  @IsNumber()
  @IsNotEmpty()
  cantidad: number;
}
