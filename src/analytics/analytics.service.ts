import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { Repository } from 'typeorm';
import { QuoteMetricsQueryDto } from './dto/quote-metrics-query.dto';
import { VisitMetricsQueryDto } from './dto/visit-metrics-query.dto';
import { Visit } from 'src/visits/entities/visit.entity';
import { ExchangeRateService } from 'src/common/exchange-rate.service';

interface QuoteMetricsRaw {
  total: string;
  pending: string;
  approved: string;
  totalAmount: string;
  currency?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async getQuoteStats({ userId, startDate, endDate }: QuoteMetricsQueryDto) {
    // 1. Obtenemos las tasas de HOY desde tu caché en 0 ms
    const todayRates = await this.exchangeRateService.getRates();

    const queryBuilder = this.quoteRepository.createQueryBuilder('quote');

    if (userId) {
      queryBuilder.andWhere('quote.user_id = :userId', { userId }); // Cuidado con el snake_case de tu BD
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'quote.created_at BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    // 2. Agrupamos por moneda
    const metricsByCurrency = await queryBuilder
      .select('quote.currency', 'currency')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE quote.status = '${QuoteStatus.PENDIENTE}')`,
        'pending',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE quote.status = '${QuoteStatus.APROBADO}')`,
        'approved',
      )
      .addSelect('SUM(quote.amount)', 'totalAmount')
      .groupBy('quote.currency')
      .getRawMany<QuoteMetricsRaw>();

    // 3. Consolidamos todo a Dólares
    let finalTotalAmountUSD = 0;
    let total = 0,
      pending = 0,
      approved = 0;

    metricsByCurrency.forEach((metric: QuoteMetricsRaw) => {
      const currency = metric.currency || 'USD';
      const amountInCurrency = parseFloat(metric.totalAmount || '0');
      const rate = todayRates[currency] || 1;

      if (currency === 'USD') {
        finalTotalAmountUSD += amountInCurrency;
      } else {
        finalTotalAmountUSD += amountInCurrency / rate;
        console.log('monto antes: ', amountInCurrency);
        console.log('tasa: ', rate);
        console.log('monto convertido a USD: ', amountInCurrency / rate);
      }

      total += parseInt(metric.total || '0', 10);
      pending += parseInt(metric.pending || '0', 10);
      approved += parseInt(metric.approved || '0', 10);
    });

    return {
      total,
      pending,
      approved,
      totalAmount: parseFloat(finalTotalAmountUSD.toFixed(2)),
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
