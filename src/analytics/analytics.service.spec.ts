import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Quote } from 'src/quotes/entities/quote.entity';
import { Visit } from 'src/visits/entities/visit.entity';
import { ExchangeRateService } from 'src/common/exchange-rate.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { DepartmentAccessDeniedException } from 'src/common/access/access.exceptions';
import { User, UserDepartment } from 'src/users/entities';
import { Role } from 'src/users/interfaces';
import { InvalidDateRangeException } from './exceptions/analytics.exceptions';

// Postgres devuelve los bigint como string: los datos de prueba lo reflejan
const buildUser = (id: string, role: Role, departmentIds: string[]): User =>
  ({
    id,
    role,
    userDepartments: departmentIds.map((deptId) => ({
      department: { id: deptId },
    })),
  }) as unknown as User;

const buildQueryBuilder = () => {
  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    clone: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(undefined),
    getCount: jest.fn().mockResolvedValue(0),
  };
  qb.clone.mockReturnValue(qb);
  return qb;
};

/** Condiciones SQL pasadas a andWhere, para comprobar el alcance aplicado */
const conditionsOf = (qb: ReturnType<typeof buildQueryBuilder>) =>
  qb.andWhere.mock.calls.map(([condition]) => condition as string);

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let quoteQb: ReturnType<typeof buildQueryBuilder>;
  let visitQb: ReturnType<typeof buildQueryBuilder>;

  // Empleado de PROYECTOS (1) y VENTAS (3); admin de PROYECTOS (1) y DESARROLLO (2)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  beforeEach(async () => {
    quoteQb = buildQueryBuilder();
    visitQb = buildQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        AccessScopeService,
        {
          provide: getRepositoryToken(Quote),
          useValue: { createQueryBuilder: jest.fn(() => quoteQb) },
        },
        {
          provide: getRepositoryToken(Visit),
          useValue: { createQueryBuilder: jest.fn(() => visitQb) },
        },
        { provide: getRepositoryToken(UserDepartment), useValue: {} },
        {
          provide: ExchangeRateService,
          useValue: { getRates: jest.fn().mockResolvedValue({ PEN: 4 }) },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('alcance', () => {
    it('un empleado solo ve sus cotizaciones aunque pida las de otro usuario', async () => {
      await service.getQuoteStats({ userId: 8 }, employee);

      const conditions = conditionsOf(quoteQb);
      expect(conditions).toContain('(quote.userId = :scopeUserId)');
      expect(conditions).toContain(
        'quote.departmentId IN (:...scopeDepartmentIds)',
      );
      expect(conditions).not.toContain('quote.userId = :userId');
      // Las colaboraciones no suman en sus métricas
      expect(conditions.join(' ')).not.toContain('collaboratorId');
    });

    it('un empleado puede pedir las métricas de una de sus áreas', async () => {
      await service.getVisitStats({ departmentId: 3 }, employee);

      expect(conditionsOf(visitQb)).toContain(
        'visit.departmentId = :departmentId',
      );
    });

    it('un empleado no puede pedir las métricas de un área ajena', async () => {
      await expect(
        service.getQuoteStats({ departmentId: 2 }, employee),
      ).rejects.toThrow(DepartmentAccessDeniedException);
      expect(quoteQb.getRawMany).not.toHaveBeenCalled();
    });

    it('el admin puede filtrar por cualquier usuario y área', async () => {
      await service.getQuoteStats({ userId: 8, departmentId: 3 }, admin);

      const conditions = conditionsOf(quoteQb);
      expect(conditions).toContain('quote.userId = :userId');
      expect(conditions).toContain('quote.departmentId = :departmentId');
      expect(conditions.join(' ')).not.toContain('scopeUserId');
    });

    it('el admin sin filtros ve todo', async () => {
      await service.getVisitStats({}, admin);

      expect(conditionsOf(visitQb)).toEqual(['contact.id IS NOT NULL']);
    });
  });

  describe('fechas', () => {
    it('incluye el último día completo del rango', async () => {
      await service.getQuoteStats(
        { startDate: '2026-10-11', endDate: '2026-10-17' },
        admin,
      );

      expect(quoteQb.andWhere).toHaveBeenCalledWith(
        'quote.createdAt >= CAST(:startDate AS date)',
        { startDate: '2026-10-11' },
      );
      expect(quoteQb.andWhere).toHaveBeenCalledWith(
        'quote.createdAt < CAST(:endDate AS date) + 1',
        { endDate: '2026-10-17' },
      );
    });

    it('acepta un rango de un solo día', async () => {
      await expect(
        service.getVisitStats(
          { startDate: '2026-10-12', endDate: '2026-10-12' },
          admin,
        ),
      ).resolves.toBeDefined();
    });

    it('rechaza un rango con inicio posterior al fin', async () => {
      await expect(
        service.getQuoteStats(
          { startDate: '2026-10-17', endDate: '2026-10-11' },
          admin,
        ),
      ).rejects.toThrow(InvalidDateRangeException);
    });
  });

  describe('getQuoteStats', () => {
    it('consolida los montos en dólares y suma los contadores de cada moneda', async () => {
      quoteQb.getRawMany.mockResolvedValue([
        {
          currency: 'USD',
          total: '2',
          pending: '1',
          approved: '1',
          totalAmount: '100',
        },
        {
          currency: 'PEN',
          total: '3',
          pending: '2',
          approved: '0',
          totalAmount: '400',
        },
      ]);

      await expect(service.getQuoteStats({}, admin)).resolves.toEqual({
        total: 5,
        pending: 3,
        approved: 1,
        totalAmount: 200, // 100 USD + 400 PEN / 4
      });
    });
  });

  describe('getVisitStats', () => {
    it('usa una copia de la consulta base para cada métrica', async () => {
      visitQb.getCount.mockResolvedValue(4);
      visitQb.getRawOne
        .mockResolvedValueOnce({ name: 'ACME', count: '3' })
        .mockResolvedValueOnce({ name: 'Ana Pérez', count: '2' })
        .mockResolvedValueOnce({ date: '2026-10-12', count: '2' });

      await expect(service.getVisitStats({}, employee)).resolves.toEqual({
        total: 4,
        mostVisitedClient: { name: 'ACME', count: 3 },
        mostVisitedContact: { name: 'Ana Pérez', count: 2 },
        peakActivityDay: { date: '2026-10-12', count: 2 },
      });
      expect(visitQb.clone).toHaveBeenCalledTimes(4);
    });

    it('devuelve valores vacíos cuando no hay visitas', async () => {
      await expect(service.getVisitStats({}, employee)).resolves.toEqual({
        total: 0,
        mostVisitedClient: { name: 'N/A', count: 0 },
        mostVisitedContact: { name: 'N/A', count: 0 },
        peakActivityDay: { date: null, count: 0 },
      });
    });
  });
});
