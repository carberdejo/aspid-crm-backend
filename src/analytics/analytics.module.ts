import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from 'src/quotes/entities/quote.entity';
import { User } from 'src/users/entities/user.entity';
import { Visit } from 'src/visits/entities/visit.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule, // Importamos el CommonModule para tener acceso al ExchangeRateService y otros servicios comunes
    TypeOrmModule.forFeature([Quote, User, Visit]), // Aquí agregamos las entidades que consultaremos
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
