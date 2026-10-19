import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import {
  InvoiceAmountExceedsOrderException,
  InvoiceAnnulledException,
  InvoiceCurrencyMismatchException,
  InvoiceNumberAlreadyExistsException,
} from './exceptions/invoice.exceptions';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ResourceOwnershipException } from 'src/common/access/access.exceptions';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { BillingStatus } from 'src/orders/interfaces/billing-status.enum';
import { DocumentStatus } from 'src/orders/interfaces/document-status.enum';
import { OrderAnnulledException } from 'src/orders/exceptions/order.exceptions';
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
  userId: '8',
  departmentId: '3',
  collaboratorId: null,
  ...overrides,
});

const buildPo = (overrides: Record<string, unknown> = {}) => ({
  id: '30',
  poNumber: 'OC-001',
  quoteId: '20',
  amount: '1000.00',
  currency: 'USD',
  status: DocumentStatus.VIGENTE,
  ...overrides,
});

const buildInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: '40',
  orderId: '30',
  invoiceNumber: 'F001-0001',
  amount: '400.00',
  currency: 'USD',
  status: DocumentStatus.VIGENTE,
  ...overrides,
});

describe('InvoicesService', () => {
  let service: InvoicesService;

  // Empleado de PROYECTOS (1) y VENTAS (3)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  const createInvoiceDto = {
    orderId: 30,
    invoiceNumber: 'F001-0001',
    amount: 400,
    issueDate: '2026-10-05',
  };

  // Estado que devuelve el manager de la transacción en cada prueba
  const state: {
    po: Record<string, unknown>;
    quote: Record<string, unknown>;
    invoice?: Record<string, unknown>;
    invoiced: string; // suma de las demás facturas vigentes
  } = { po: buildPo(), quote: buildQuote(), invoiced: '0' };

  const sumQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(() => Promise.resolve({ total: state.invoiced })),
  };
  const manager = {
    findOne: jest.fn((entity: unknown) =>
      Promise.resolve(entity === PurchaseOrder ? state.po : state.invoice),
    ),
    findOneOrFail: jest.fn((entity: unknown) =>
      Promise.resolve(entity === Invoice ? state.invoice : state.quote),
    ),
    create: jest.fn((_entity: unknown, data: object) => data),
    merge: jest.fn((_entity: unknown, target: object, changes: object) =>
      Object.assign(target, changes),
    ),
    save: jest.fn((data: object) => Promise.resolve(data)),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => sumQueryBuilder),
  };
  const mockDataSource = {
    transaction: jest.fn((work: (m: typeof manager) => unknown) =>
      work(manager),
    ),
  };

  const queryBuilder = {
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
  const mockInvoiceRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  beforeEach(async () => {
    state.po = buildPo();
    state.quote = buildQuote();
    state.invoice = buildInvoice();
    state.invoiced = '0';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        AccessScopeService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        { provide: getRepositoryToken(UserDepartment), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should invoice an own PO and mark it as partially invoiced', async () => {
      // ARRANGE
      state.quote = buildQuote({ userId: '5' });

      // ACT
      const result = await service.create(createInvoiceDto, employee);

      // ASSERT
      expect(result.message).toContain('F001-0001');
      expect(manager.findOne).toHaveBeenCalledWith(PurchaseOrder, {
        where: { id: 30 },
        lock: { mode: 'pessimistic_write' },
      });
      // La factura toma la moneda de la OC
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: 'F001-0001',
          currency: 'USD',
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(PurchaseOrder, 30, {
        billingStatus: BillingStatus.FACTURADO_PARCIAL,
      });
    });

    it('should mark the PO as completely invoiced when the total is reached', async () => {
      state.invoiced = '600.00';

      await service.create(createInvoiceDto, admin);

      expect(manager.update).toHaveBeenCalledWith(PurchaseOrder, 30, {
        billingStatus: BillingStatus.FACTURADO_COMPLETO,
      });
    });

    it('should reject an amount above what remains to invoice', async () => {
      state.invoiced = '800.00';

      await expect(service.create(createInvoiceDto, admin)).rejects.toThrow(
        InvoiceAmountExceedsOrderException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('should reject an invoice in a currency different from the PO', async () => {
      await expect(
        service.create(
          { ...createInvoiceDto, currency: 'PEN' as never },
          admin,
        ),
      ).rejects.toThrow(InvoiceCurrencyMismatchException);
    });

    it('should reject invoicing an annulled PO', async () => {
      state.po = buildPo({ status: DocumentStatus.ANULADA });

      await expect(service.create(createInvoiceDto, admin)).rejects.toThrow(
        OrderAnnulledException,
      );
    });

    it('should translate a duplicated invoice number into a business error', async () => {
      manager.save.mockRejectedValueOnce(
        new QueryFailedError('INSERT', [], {
          code: '23505',
          constraint: 'uk_invoice_number',
        } as unknown as Error),
      );

      await expect(service.create(createInvoiceDto, admin)).rejects.toThrow(
        InvoiceNumberAlreadyExistsException,
      );
    });

    it('should forbid invoicing a PO of another user', async () => {
      await expect(service.create(createInvoiceDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('should forbid a collaborator from invoicing', async () => {
      state.quote = buildQuote({ collaboratorId: '5' });

      await expect(service.create(createInvoiceDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // findOne final (respuesta con el detalle actualizado)
      queryBuilder.getOne.mockResolvedValue({
        ...buildInvoice(),
        order: { ...buildPo(), quote: buildQuote() },
      });
    });

    it('should check the new amount against the other active invoices', async () => {
      // Otras facturas: 700 de 1000; esta factura no puede pasar de 300
      state.invoiced = '700.00';

      await expect(service.update(40, { amount: 301 }, admin)).rejects.toThrow(
        InvoiceAmountExceedsOrderException,
      );
      expect(sumQueryBuilder.andWhere).toHaveBeenCalledWith(
        'invoice.id != :excludeInvoiceId',
        { excludeInvoiceId: 40 },
      );
    });

    it('should update the invoice and recalculate the billing status', async () => {
      state.invoiced = '700.00';

      await service.update(40, { amount: 300 }, admin);

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 300 }),
      );
      expect(manager.update).toHaveBeenCalledWith(PurchaseOrder, '30', {
        billingStatus: BillingStatus.FACTURADO_COMPLETO,
      });
    });

    it('should forbid editing an annulled invoice', async () => {
      state.invoice = buildInvoice({ status: DocumentStatus.ANULADA });

      await expect(
        service.update(40, { invoiceNumber: 'F001-0002' }, admin),
      ).rejects.toThrow(InvoiceAnnulledException);
    });
  });

  describe('annul', () => {
    const annulDto = { annulReason: 'Factura emitida con datos erróneos' };

    it('should annul the invoice and recalculate the billing status', async () => {
      // Sin otras facturas vigentes la OC vuelve a pendiente de facturación
      const result = await service.annul(40, annulDto, admin);

      expect(result.message).toContain('F001-0001');
      expect(manager.update).toHaveBeenCalledWith(Invoice, 40, {
        status: DocumentStatus.ANULADA,
        annulledAt: expect.any(Function) as () => string,
        annulledBy: '1',
        annulReason: annulDto.annulReason,
      });
      expect(manager.update).toHaveBeenCalledWith(PurchaseOrder, '30', {
        billingStatus: BillingStatus.PENDIENTE_FACTURACION,
      });
    });

    it('should forbid annulling an already annulled invoice', async () => {
      state.invoice = buildInvoice({ status: DocumentStatus.ANULADA });

      await expect(service.annul(40, annulDto, admin)).rejects.toThrow(
        InvoiceAnnulledException,
      );
    });

    it('should forbid annulling an invoice of another user', async () => {
      await expect(service.annul(40, annulDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(manager.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should scope invoices through the quote for a user', async () => {
      await service.findAll({ limit: 10, offset: 0 }, employee);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(quote.userId = :scopeUserId OR quote.collaboratorId = :scopeUserId)',
        { scopeUserId: 5 },
      );
    });

    it('should not restrict the list for admin', async () => {
      await service.findAll({ limit: 10, offset: 0 }, admin);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const buildInvoiceDetail = (
      quoteOverrides: Record<string, unknown> = {},
    ) => ({
      id: '40',
      order: { ...buildPo(), quote: buildQuote(quoteOverrides) },
    });

    it('should join the client through the quote (the PO has no client relation)', async () => {
      queryBuilder.getOne.mockResolvedValue(
        buildInvoiceDetail({ userId: '5' }),
      );

      await service.findOne(40, employee);

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'order.quote',
        'quote',
      );
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'quote.client',
        'client',
      );
    });

    it('should forbid reading an invoice of another user', async () => {
      queryBuilder.getOne.mockResolvedValue(buildInvoiceDetail());

      await expect(service.findOne(40, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });
  });
});
