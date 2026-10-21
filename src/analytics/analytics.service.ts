import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { QuoteMetricsQueryDto } from './dto/quote-metrics-query.dto';
import { VisitMetricsQueryDto } from './dto/visit-metrics-query.dto';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { Visit } from 'src/visits/entities/visit.entity';
import { ExchangeRateService } from 'src/common/exchange-rate.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { User } from 'src/users/entities';
import { InvalidDateRangeException } from './exceptions/analytics.exceptions';

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
    private readonly accessScopeService: AccessScopeService,
  ) {}

  async getQuoteStats(query: QuoteMetricsQueryDto, currentUser: User) {
    // 1. Obtenemos las tasas de HOY desde tu caché en 0 ms
    const todayRates = await this.exchangeRateService.getRates();

    const queryBuilder = this.quoteRepository.createQueryBuilder('quote');
    // Solo cotizaciones propias: las colaboraciones no suman (evita contar dos veces el monto)
    this.applyMetricsFilters(
      queryBuilder,
      'quote',
      'createdAt',
      query,
      currentUser,
    );

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

      finalTotalAmountUSD +=
        currency === 'USD' ? amountInCurrency : amountInCurrency / rate;

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

  async getVisitStats(query: VisitMetricsQueryDto, currentUser: User) {
    const baseQuery = this.visitRepository
      .createQueryBuilder('visit')
      .leftJoin('visit.client', 'client')
      .leftJoin('visit.contact', 'contact');

    this.applyMetricsFilters(baseQuery, 'visit', 'date', query, currentUser);

    // Cada métrica usa su propia copia: select/groupBy/limit no se arrastran entre consultas
    // 1. Total de Visitas
    const totalVisits = await baseQuery.clone().getCount();

    // 2. Cliente más visitado
    const topClient = await baseQuery
      .clone()
      .select('client.commercialName', 'name')
      .addSelect('COUNT(visit.id)', 'count')
      .groupBy('client.id')
      .addGroupBy('client.commercialName')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne<{ name: string; count: string }>();

    // 3. Contacto más visitado (las visitas sin contacto no compiten)
    const topContact = await baseQuery
      .clone()
      .andWhere('contact.id IS NOT NULL')
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
      .clone()
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

  /**
   * Alcance y filtros comunes de las métricas.
   *
   * - user: siempre sus propios registros (se ignora el userId enviado) y solo en
   *   sus áreas; si pide un área ajena recibe 403.
   * - admin: puede filtrar por cualquier usuario y área, o ver todo.
   *
   * Fechas: ambos extremos inclusivos. El fin se compara como "< día siguiente"
   * para no perder el último día cuando la columna es un timestamp (created_at).
   */
  private applyMetricsFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    dateField: string,
    { userId, departmentId, startDate, endDate }: MetricsQueryDto,
    currentUser: User,
  ): void {
    if (startDate && endDate && startDate.slice(0, 10) > endDate.slice(0, 10))
      throw new InvalidDateRangeException(startDate, endDate);

    if (this.accessScopeService.isAdmin(currentUser)) {
      if (userId)
        queryBuilder.andWhere(`${alias}.userId = :userId`, { userId });
    } else {
      if (departmentId)
        this.accessScopeService.assertDepartmentAccess(
          currentUser,
          departmentId,
        );
      this.accessScopeService.applyScope(queryBuilder, alias, currentUser);
    }

    if (departmentId)
      queryBuilder.andWhere(`${alias}.departmentId = :departmentId`, {
        departmentId,
      });

    if (startDate)
      queryBuilder.andWhere(
        `${alias}.${dateField} >= CAST(:startDate AS date)`,
        { startDate: startDate.slice(0, 10) },
      );

    if (endDate)
      queryBuilder.andWhere(
        `${alias}.${dateField} < CAST(:endDate AS date) + 1`,
        { endDate: endDate.slice(0, 10) },
      );
  }
}
