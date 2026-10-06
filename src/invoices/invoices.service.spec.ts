import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ResourceOwnershipException } from 'src/common/access/access.exceptions';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { BillingStatus } from 'src/orders/interfaces/billing-status.enum';
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

const buildOrder = (quoteOverrides: Record<string, unknown> = {}) => ({
  id: '30',
  amount: '1000.00',
  quote: {
    id: '20',
    userId: '8',
    departmentId: '3',
    collaboratorId: null,
    ...quoteOverrides,
  },
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

  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: { save: jest.fn(), update: jest.fn() },
  };
  const mockDataSource = { createQueryRunner: jest.fn(() => queryRunner) };

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
    create: jest.fn((data: object) => data),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  const mockCommonValidationService = {
    validatePurchaseOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        AccessScopeService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        { provide: getRepositoryToken(UserDepartment), useValue: {} },
        {
          provide: CommonValidationService,
          useValue: mockCommonValidationService,
        },
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
      mockCommonValidationService.validatePurchaseOrder.mockResolvedValue(
        buildOrder({ userId: '5' }),
      );

      // ACT
      const result = await service.create(createInvoiceDto, employee);

      // ASSERT
      expect(result.message).toContain('F001-0001');
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        PurchaseOrder,
        30,
        { billingStatus: BillingStatus.FACTURADO_PARCIAL },
      );
    });

    it('should forbid invoicing a PO of another user', async () => {
      mockCommonValidationService.validatePurchaseOrder.mockResolvedValue(
        buildOrder(),
      );

      await expect(service.create(createInvoiceDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should forbid a collaborator from invoicing', async () => {
      mockCommonValidationService.validatePurchaseOrder.mockResolvedValue(
        buildOrder({ collaboratorId: '5' }),
      );

      await expect(service.create(createInvoiceDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });

    it('should reject an amount above what remains to invoice', async () => {
      mockCommonValidationService.validatePurchaseOrder.mockResolvedValue(
        buildOrder(),
      );
      mockInvoiceRepository.find.mockResolvedValueOnce([{ amount: '800.00' }]);

      await expect(service.create(createInvoiceDto, admin)).rejects.toThrow(
        BadRequestException,
      );
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
    it('should join the client through the quote (the PO has no client relation)', async () => {
      queryBuilder.getOne.mockResolvedValue({
        id: '40',
        order: buildOrder({ userId: '5' }),
      });

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
      queryBuilder.getOne.mockResolvedValue({ id: '40', order: buildOrder() });

      await expect(service.findOne(40, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });
  });
});
