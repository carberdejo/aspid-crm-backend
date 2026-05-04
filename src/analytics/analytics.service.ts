import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { Repository } from 'typeorm';
import { QuoteMetricsQueryDto } from './dto/quote-metrics-query.dto';

interface QuoteMetricsRaw {
  total: string;
  pending: string;
  approved: string;
  totalAmount: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async getQuoteStats({ userId, startDate, endDate }: QuoteMetricsQueryDto) {
    const queryBuilder = this.quoteRepository.createQueryBuilder('quote');

    // Filtro por usuario si se proporciona
    if (userId) {
      queryBuilder.andWhere('quote.userId = :userId', { userId });
    }

    // Filtro por rango de fechas
    if (startDate && endDate) {
      queryBuilder.andWhere('quote.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const metrics = await queryBuilder
      .select('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE quote.status = '${QuoteStatus.PENDIENTE}')`,
        'pending',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE quote.status = '${QuoteStatus.APROBADO}')`,
        'approved',
      )
      .addSelect('SUM(quote.amount)', 'totalAmount')
      .getRawOne<QuoteMetricsRaw>();

    return {
      total: parseInt(metrics?.total || '0', 10),
      pending: parseInt(metrics?.pending || '0', 10),
      approved: parseInt(metrics?.approved || '0', 10),
      totalAmount: parseFloat(metrics?.totalAmount || '0'),
    };
  }
}
