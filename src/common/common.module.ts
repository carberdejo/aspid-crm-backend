import { Module } from '@nestjs/common';
import { TransformResponseInterceptor } from './interceptor/transform-response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filters';
import { AppLoggerService } from './logging/logger.service';
import { CommonValidationService } from './common-validation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { Quote } from 'src/quotes/entities/quote.entity';
import { User, UserDepartment } from 'src/users/entities';
import { Client, ContactClient } from 'src/clients/entities';
import { Department } from 'src/departments/entities/department.entity';
import { Visit } from 'src/visits/entities/visit.entity';
import { ExchangeRateService } from './exchange-rate.service';
import { AccessScopeService } from './access/access-scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      Quote,
      User,
      UserDepartment,
      Client,
      ContactClient,
      Department,
      Visit,
    ]),
  ],
  providers: [
    TransformResponseInterceptor,
    HttpExceptionFilter,
    AppLoggerService,
    CommonValidationService,
    ExchangeRateService,
    AccessScopeService,
  ],
  exports: [
    TransformResponseInterceptor,
    HttpExceptionFilter,
    AppLoggerService,
    CommonValidationService,
    ExchangeRateService,
    AccessScopeService,
  ],
})
export class CommonModule {}
