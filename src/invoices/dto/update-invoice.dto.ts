import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateInvoiceDto } from './create-invoice.dto';

// La OC y la moneda de una factura no se cambian: la moneda es siempre la de su OC
export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateInvoiceDto, ['orderId', 'currency'] as const),
) {}
