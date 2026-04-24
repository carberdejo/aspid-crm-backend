import { Module } from '@nestjs/common';
import { TransformResponseInterceptor } from './interceptor/transform-response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filters';
import { AppLoggerService } from './logging/logger.service';
import { UsersModule } from 'src/users/users.module';
import { DepartmentsModule } from 'src/departments/departments.module';
import { ClientsModule } from 'src/clients/clients.module';
import { CommonValidationService } from './common-validation.service';

@Module({
  imports: [UsersModule, ClientsModule, DepartmentsModule],
  providers: [
    TransformResponseInterceptor,
    HttpExceptionFilter,
    AppLoggerService,
    CommonValidationService,
  ],
  exports: [
    TransformResponseInterceptor,
    HttpExceptionFilter,
    AppLoggerService,
    CommonValidationService,
  ],
})
export class CommonModule {}
