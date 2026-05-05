import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsISO8601,
} from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  poNumber: string;

  @IsOptional()
  @IsISO8601()
  receivedAt?: string;

  @IsNumber()
  @IsNotEmpty()
  quoteId: number;
}
