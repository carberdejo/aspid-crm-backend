import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryItemDto } from './delivery-item-dto';

export class CreateDeliveryDto {
  // Sin cliente: se omite o se envía 0 (se guarda como NULL)
  @IsOptional()
  @IsNumber()
  clientId?: number;

  // Solo lo considera un admin; para un usuario se toma del token
  @IsOptional()
  @IsNumber()
  userId?: number;

  // Área en la que se registra la entrega: debe ser una de las del usuario
  @IsNumber()
  @IsNotEmpty()
  departmentId: number;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  // Validamos que sea un array y que cada elemento cumpla con DeliveryItemDto
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemDto)
  deliveryItems?: DeliveryItemDto[];
}
