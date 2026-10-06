import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreatePurchaseOrderDto } from './dto/create-order.dto';
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

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
  //   return this.ordersService.update(+id, updateOrderDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.ordersService.remove(+id);
  // }
}
