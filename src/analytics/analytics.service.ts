import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { Repository } from 'typeorm';
import { QuoteMetricsQueryDto } from './dto/quote-metrics-query.dto';
import { VisitMetricsQueryDto } from './dto/visit-metrics-query.dto';
import { Visit } from 'src/visits/entities/visit.entity';

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
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
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

  async getVisitStats({ userId, startDate, endDate }: VisitMetricsQueryDto) {
    const baseQuery = this.visitRepository
      .createQueryBuilder('visit')
      .leftJoin('visit.client', 'client')
      .leftJoin('visit.contact', 'contact');

    // Aplicar filtros base
    if (userId) {
      baseQuery.andWhere('visit.userId = :userId', { userId });
    }

    if (startDate && endDate) {
      baseQuery.andWhere('visit.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // 1. Total de Visitas
    const totalVisits = await baseQuery.getCount();

    // 2. Cliente más visitado
    const topClient = await baseQuery
      .select('client.commercialName', 'name')
      .addSelect('COUNT(visit.id)', 'count')
      .groupBy('client.id')
      .addGroupBy('client.commercialName')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne<{ name: string; count: string }>();

    // 3. Contacto más visitado
    const topContact = await baseQuery
      .select("CONCAT(contact.firstName, ' ', contact.lastName)", 'name')
      .addSelect('COUNT(visit.id)', 'count')
      .groupBy('contact.id')
      .addGroupBy('contact.firstName')
      .addGroupBy('contact.lastName')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne<{ name: string; count: string }>();

    // 4. Día con más actividad (Pico de salidas)
    const peakDate = await baseQuery
      .select('visit.date', 'date')
      .addSelect('COUNT(visit.id)', 'count')
      .groupBy('visit.date')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne<{ date: string; count: string }>();

    return {
      total: totalVisits,
      mostVisitedClient: {
        name: topClient?.name || 'N/A',
        count: parseInt(topClient?.count || '0', 10),
      },
      mostVisitedContact: {
        name: topContact?.name || 'N/A',
        count: parseInt(topContact?.count || '0', 10),
      },
      peakActivityDay: {
        date: peakDate?.date || null,
        count: parseInt(peakDate?.count || '0', 10),
      },
    };
  }
}
