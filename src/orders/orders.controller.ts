import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreatePurchaseOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AnnulDocumentDto } from './dto/annul-document.dto';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { CurrentUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() createOrderDto: CreatePurchaseOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Get()
  findAll(@Query() queryDto: QueryPurchaseOrderDto, @CurrentUser() user: User) {
    return this.ordersService.findAll(queryDto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.findOne(+id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.update(id, updateOrderDto, user);
  }

  // Anular en lugar de eliminar: la OC queda registrada con su motivo
  @Patch(':id/annul')
  annul(
    @Param('id', ParseIntPipe) id: number,
    @Body() annulDto: AnnulDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.annul(id, annulDto, user);
  }
}
