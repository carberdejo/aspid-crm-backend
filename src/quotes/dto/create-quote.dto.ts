import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { QuoteCurrency } from '../interfaces/quote-currency.enum';

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  quoteNumber: string;

  // Solo lo considera un admin; para un usuario se toma del token
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsNumber()
  @IsNotEmpty()
  clientId: number;

  @IsNumber()
  @IsNotEmpty()
  contactId: number;

  @IsNumber()
  @IsNotEmpty()
  departmentId: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  orderType?: string;

  @IsNumber()
  @IsOptional()
  collaboratorId?: number;

  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @IsEnum(QuoteCurrency)
  @IsOptional() // Opcional si quieres que por defecto sea PEN
  currency?: QuoteCurrency;
}
