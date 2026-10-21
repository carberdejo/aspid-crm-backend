import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { QuoteMetricsQueryDto } from './dto/quote-metrics-query.dto';
import { VisitMetricsQueryDto } from './dto/visit-metrics-query.dto';
import { Auth, CurrentUser } from 'src/auth/decorators';
import { Role } from 'src/users/interfaces';
import { User } from 'src/users/entities';

// Admin: métricas de cualquier usuario y área. User: solo las suyas, en sus áreas
@Auth(Role.ADMIN, Role.USER)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('quotes-summary')
  async getQuotesSummary(
    @Query() query: QuoteMetricsQueryDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.analyticsService.getQuoteStats(query, currentUser);
  }

  @Get('visits-summary')
  async getVisitsSummary(
    @Query() query: VisitMetricsQueryDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.analyticsService.getVisitStats(query, currentUser);
  }
}
