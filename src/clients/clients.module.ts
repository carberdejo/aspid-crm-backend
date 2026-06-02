import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client, ContactClient } from './entities';
import { Portfolio } from 'src/portfolios/entities/portfolio.entity';
import { IndustrySegment } from 'src/catalogs/entities/industry-segment.entity';
import { UserClientExceptionsController } from './user-client-exceptions.controller';
import { UserClientExceptionsService } from './user-client-exceptions.service';
import { UserClientException } from './entities/user-client-exception.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ContactClient,
      Portfolio,
      IndustrySegment,
      UserClientException,
    ]),
    CommonModule,
  ],
  controllers: [ClientsController, UserClientExceptionsController],
  providers: [ClientsService, UserClientExceptionsService],
  exports: [ClientsService, TypeOrmModule],
})
export class ClientsModule {}
