import { Module } from '@nestjs/common';
import { DeliverysService } from './deliverys.service';
import { DeliverysController } from './deliverys.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Delivery]), CommonModule],
  controllers: [DeliverysController],
  providers: [DeliverysService],
  exports: [DeliverysService, TypeOrmModule],
})
export class DeliverysModule {}
