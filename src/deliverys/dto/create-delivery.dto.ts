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
  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

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
