import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsPositive,
  IsDateString,
} from 'class-validator';

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
}
