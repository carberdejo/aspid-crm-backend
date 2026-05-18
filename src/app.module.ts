import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ValidationSchema } from './config/joi.validation';
import { databaseConfig } from './config/configuration';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuthModule } from './auth/auth.module';
import { VisitsModule } from './visits/visits.module';
import { ClientsModule } from './clients/clients.module';
import { QuotesModule } from './quotes/quotes.module';
import { OrdersModule } from './orders/orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { CatalogsModule } from './catalogs/catalogs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Hacer que el módulo de configuración sea global para que esté disponible en toda la aplicación sin necesidad de importarlo en cada módulo
      isGlobal: true,
      // Cargar variables de entorno desde el archivo .env
      envFilePath: `.env`,
      // Validar las variables de entorno utilizando Joi
      validationSchema: ValidationSchema,
      // Configurar opciones de validación para mostrar todos los errores de validación y permitir variables de entorno adicionales
      validationOptions: {
        abortEarly: false, // Mostrar todos los errores de validación en lugar de solo el primero
        allowUnknown: true, // Permitir variables de entorno adicionales que no estén definidas en el esquema de validación
      },
      // Cargar configuraciones personalizadas, como la configuración de la base de datos, para centralizar la gestión de la configuración de la aplicación
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        schema: configService.get('POSTGRES_SCHEMA'),
        autoLoadEntities: true,
        synchronize: false, // No usar synchronize en producción, ya que puede causar pérdida de datos. Usar migraciones en su lugar.
        // logger: 'simple-console', // Configurar el logger para mostrar consultas SQL en la consola
        // logging: ['query', 'error'], // Habilitar el logging de consultas y errores para facilitar la depuración y el monitoreo de la base de datos
      }),
    }),
    CommonModule,
    UsersModule,
    DepartmentsModule,
    AuthModule,
    VisitsModule,
    ClientsModule,
    QuotesModule,
    OrdersModule,
    AnalyticsModule,
    InvoicesModule,
    PortfoliosModule,
    CatalogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
