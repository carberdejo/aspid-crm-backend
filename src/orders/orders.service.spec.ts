import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { OrdersService } from './orders.service';
import { PurchaseOrder } from './entities/order.entity';
import { BillingStatus } from './interfaces/billing-status.enum';
import { DocumentStatus } from './interfaces/document-status.enum';
import {
  OrderAmountBelowInvoicedException,
  OrderAnnulledException,
  OrderHasActiveInvoicesException,
  PoNumberAlreadyExistsException,
  QuoteHasActiveOrderException,
} from './exceptions/order.exceptions';
import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ResourceOwnershipException } from 'src/common/access/access.exceptions';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { QuoteInvalidStatusTransitionException } from 'src/quotes/exceptions/quote.exceptions';
import { User, UserDepartment } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

// Postgres devuelve los bigint y decimales como string: los datos de prueba lo reflejan
const buildUser = (id: string, role: Role, departmentIds: string[]): User =>
  ({
    id,
    role,
    userDepartments: departmentIds.map((deptId) => ({
      department: { id: deptId },
    })),
  }) as unknown as User;

const buildQuote = (overrides: Record<string, unknown> = {}) => ({
  id: '20',
  quoteNumber: 'COT-020',
  userId: '8',
  departmentId: '3',
  collaboratorId: null,
  currency: 'PEN',
  status: QuoteStatus.PENDIENTE,
  ...overrides,
});

const buildPo = (overrides: Record<string, unknown> = {}) => ({
  id: '30',
  poNumber: 'OC-001',
  quoteId: '20',
  amount: '1000.00',
  currency: 'USD',
  status: DocumentStatus.VIGENTE,
  billingStatus: BillingStatus.PENDIENTE_FACTURACION,
  ...overrides,
});

const uniqueViolation = (constraint: string) =>
  new QueryFailedError('INSERT', [], {
    code: '23505',
    constraint,
  } as unknown as Error);

describe('OrdersService', () => {
  let service: OrdersService;

  // Empleado de PROYECTOS (1) y VENTAS (3)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  const createPoDto = { poNumber: 'OC-001', quoteId: 20, amount: 1500 };

  // Estado que devuelve el manager de la transacción en cada prueba
  const state: {
    po?: Record<string, unknown>;
    quote: Record<string, unknown>;
    invoiced: string;
  } = { quote: buildQuote(), invoiced: '0' };

  const sumQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(() => Promise.resolve({ total: state.invoiced })),
  };
  const manager = {
    findOne: jest.fn((entity: unknown) =>
      Promise.resolve(entity === PurchaseOrder ? state.po : state.quote),
    ),
    findOneOrFail: jest.fn(() => Promise.resolve(state.quote)),
    create: jest.fn((_entity: unknown, data: object) => data),
    merge: jest.fn((_entity: unknown, target: object, changes: object) =>
      Object.assign(target, changes),
    ),
    save: jest.fn((data: object) => Promise.resolve({ id: '30', ...data })),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => sumQueryBuilder),
  };
  const mockDataSource = {
    transaction: jest.fn((work: (m: typeof manager) => unknown) =>
      work(manager),
    ),
  };

  const listQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn(),
  };
  const mockPoRepository = {
    createQueryBuilder: jest.fn(() => listQueryBuilder),
  };

  const mockCommonValidationService = {
    findQuoteById: jest.fn(),
  };

  beforeEach(async () => {
    state.po = buildPo();
    state.quote = buildQuote();
    state.invoiced = '0';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        AccessScopeService,
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: mockPoRepository,
        },
        { provide: getRepositoryToken(UserDepartment), useValue: {} },
        {
          provide: CommonValidationService,
          useValue: mockCommonValidationService,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create the PO and approve the quote in the same transaction', async () => {
      // ARRANGE
      state.quote = buildQuote({ userId: '5' });
      mockCommonValidationService.findQuoteById.mockResolvedValue(state.quote);

      // ACT
      const result = await service.create(createPoDto, employee);

      // ASSERT
      expect(result.message).toContain('OC-001');
      expect(manager.findOneOrFail).toHaveBeenCalledWith(Quote, {
        where: { id: 20 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.save).toHaveBeenCalledWith(
        // Sin moneda indicada, toma la de la cotización
        expect.objectContaining({ poNumber: 'OC-001', currency: 'PEN' }),
      );
      expect(manager.update).toHaveBeenCalledWith(
        Quote,
        20,
        expect.objectContaining({ status: QuoteStatus.APROBADO }),
      );
    });

    it('should reject the PO when the locked quote is no longer PENDIENTE (race)', async () => {
      mockCommonValidationService.findQuoteById.mockResolvedValue(
        buildQuote({ userId: '5' }),
      );
      // Otra petición la aprobó entre la validación y el bloqueo
      state.quote = buildQuote({ userId: '5', status: QuoteStatus.APROBADO });

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        QuoteHasActiveOrderException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('should reject a PO for a rejected quote before opening the transaction', async () => {
      mockCommonValidationService.findQuoteById.mockResolvedValue(
        buildQuote({ userId: '5', status: QuoteStatus.RECHAZADO }),
      );

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        QuoteInvalidStatusTransitionException,
      );
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should translate a duplicated active PO number into a business error', async () => {
      mockCommonValidationService.findQuoteById.mockResolvedValue(
        buildQuote({ userId: '5' }),
      );
      state.quote = buildQuote({ userId: '5' });
      manager.save.mockRejectedValueOnce(
        uniqueViolation('uk_po_number_active'),
      );

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        PoNumberAlreadyExistsException,
      );
    });

    it('should forbid creating a PO for a quote of another user', async () => {
      mockCommonValidationService.findQuoteById.mockResolvedValue(buildQuote());

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should forbid a collaborator from creating the PO', async () => {
      mockCommonValidationService.findQuoteById.mockResolvedValue(
        buildQuote({ collaboratorId: '5' }),
      );

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });

    it('should let the admin create a PO for any quote', async () => {
      mockCommonValidationService.findQuoteById.mockResolvedValue(buildQuote());

      await expect(service.create(createPoDto, admin)).resolves.toHaveProperty(
        'message',
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // findOne final (respuesta con el detalle actualizado)
      listQueryBuilder.getOne.mockResolvedValue({
        ...buildPo(),
        quote: { ...buildQuote(), client: {}, contact: null, user: {} },
      });
    });

    it('should forbid editing an annulled PO', async () => {
      state.po = buildPo({ status: DocumentStatus.ANULADA });

      await expect(
        service.update(30, { poNumber: 'OC-002' }, admin),
      ).rejects.toThrow(OrderAnnulledException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('should forbid changing the currency when the PO has active invoices', async () => {
      state.invoiced = '200.00';

      await expect(
        service.update(30, { currency: 'PEN' as never }, admin),
      ).rejects.toThrow(OrderHasActiveInvoicesException);
    });

    it('should forbid an amount below what is already invoiced', async () => {
      state.invoiced = '600.00';

      await expect(service.update(30, { amount: 500 }, admin)).rejects.toThrow(
        OrderAmountBelowInvoicedException,
      );
    });

    it('should recalculate the billing status when the amount changes', async () => {
      // Facturado 600 de 1000 (parcial); al bajar el monto a 600 queda completo
      state.invoiced = '600.00';

      await service.update(30, { amount: 600 }, admin);

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 600,
          billingStatus: BillingStatus.FACTURADO_COMPLETO,
        }),
      );
    });

    it('should forbid a collaborator from editing the PO', async () => {
      state.quote = buildQuote({ collaboratorId: '5' });

      await expect(
        service.update(30, { poNumber: 'OC-002' }, employee),
      ).rejects.toThrow(ResourceOwnershipException);
    });
  });

  describe('annul', () => {
    const annulDto = { annulReason: 'El cliente reenviará la OC corregida' };

    it('should annul the PO and send its quote back to PENDIENTE', async () => {
      state.quote = buildQuote({ userId: '5', status: QuoteStatus.APROBADO });

      const result = await service.annul(30, annulDto, employee);

      expect(result.message).toContain('OC-001');
      expect(manager.update).toHaveBeenCalledWith(PurchaseOrder, 30, {
        status: DocumentStatus.ANULADA,
        annulledAt: expect.any(Function) as () => string,
        annulledBy: '5',
        annulReason: annulDto.annulReason,
      });
      expect(manager.update).toHaveBeenCalledWith(
        Quote,
        '20',
        expect.objectContaining({ status: QuoteStatus.PENDIENTE }),
      );
    });

    it('should forbid annulling a PO with active invoices', async () => {
      state.invoiced = '100.00';

      await expect(service.annul(30, annulDto, admin)).rejects.toThrow(
        OrderHasActiveInvoicesException,
      );
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('should forbid annulling an already annulled PO', async () => {
      state.po = buildPo({ status: DocumentStatus.ANULADA });

      await expect(service.annul(30, annulDto, admin)).rejects.toThrow(
        OrderAnnulledException,
      );
    });

    it('should forbid annulling a PO of another user', async () => {
      await expect(service.annul(30, annulDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(manager.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should only count active invoices in what is invoiced', async () => {
      await service.findAll({ limit: 10, offset: 0 }, admin);

      expect(listQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'po.invoices',
        'invoice',
        'invoice.status = :activeStatus',
        { activeStatus: DocumentStatus.VIGENTE },
      );
    });

    it('should scope POs through the quote for a user', async () => {
      await service.findAll({ limit: 10, offset: 0 }, employee);

      expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(quote.userId = :scopeUserId OR quote.collaboratorId = :scopeUserId)',
        { scopeUserId: 5 },
      );
      expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
        'quote.departmentId IN (:...scopeDepartmentIds)',
        { scopeDepartmentIds: [1, 3] },
      );
    });

    it('should not restrict the list for admin', async () => {
      await service.findAll({ limit: 10, offset: 0 }, admin);

      expect(listQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const buildPoDetail = (quoteOverrides: Record<string, unknown> = {}) => ({
      id: '30',
      poNumber: 'OC-001',
      quote: {
        ...buildQuote(quoteOverrides),
        client: { id: '7' },
        contact: null,
        user: { firstName: 'Luis', lastName: 'Paz' },
      },
    });

    it('should forbid reading a PO of another user', async () => {
      listQueryBuilder.getOne.mockResolvedValue(buildPoDetail());

      await expect(service.findOne(30, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });

    it('should let the collaborator of the quote read the PO', async () => {
      listQueryBuilder.getOne.mockResolvedValue(
        buildPoDetail({ collaboratorId: '5' }),
      );

      await expect(service.findOne(30, employee)).resolves.toBeDefined();
    });
  });
});
