import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  quoteNumber: string;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

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
}
