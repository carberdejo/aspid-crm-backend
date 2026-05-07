import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { QuoteMetricsQueryDto } from './dto/quote-metrics-query.dto';
import { VisitMetricsQueryDto } from './dto/visit-metrics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('quotes-summary')
  async getQuotesSummary(@Query() query: QuoteMetricsQueryDto) {
    return this.analyticsService.getQuoteStats(query);
  }

  @Get('visits-summary')
  async getVisitsSummary(@Query() query: VisitMetricsQueryDto) {
    return this.analyticsService.getVisitStats(query);
  }
}
