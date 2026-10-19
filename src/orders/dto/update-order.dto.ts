import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePurchaseOrderDto } from './create-order.dto';

// La cotización de una OC no se cambia: para otra cotización se anula y se genera otra OC
export class UpdateOrderDto extends PartialType(
  OmitType(CreatePurchaseOrderDto, ['quoteId'] as const),
) {}
