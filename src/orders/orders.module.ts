import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/order.entity';
import { CommonModule } from 'src/common/common.module';
import { Quote } from 'src/quotes/entities/quote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, Quote]), CommonModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, TypeOrmModule],
})
export class OrdersModule {}
