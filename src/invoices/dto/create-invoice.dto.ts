import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsPositive,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { QuoteCurrency } from 'src/quotes/interfaces/quote-currency.enum';

export class CreateInvoiceDto {
  @IsNumber()
  @IsNotEmpty()
  orderId: number;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  issueDate: string;

  @IsOptional()
  @IsString()
  currency?: QuoteCurrency;
}
