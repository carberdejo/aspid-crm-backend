import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsISO8601,
  IsEnum,
  Min,
} from 'class-validator';
import { QuoteCurrency } from 'src/quotes/interfaces/quote-currency.enum';

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

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(QuoteCurrency)
  currency?: QuoteCurrency;
}
