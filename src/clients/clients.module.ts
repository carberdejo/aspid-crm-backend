import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client, ContactClient } from './entities';
import { Portfolio } from 'src/portfolios/entities/portfolio.entity';
import { IndustrySegment } from 'src/catalogs/entities/industry-segment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ContactClient,
      Portfolio,
      IndustrySegment,
    ]),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService, TypeOrmModule],
})
export class ClientsModule {}
