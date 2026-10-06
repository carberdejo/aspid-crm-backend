import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { PurchaseOrder } from './entities/order.entity';
import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ResourceOwnershipException } from 'src/common/access/access.exceptions';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { User, UserDepartment } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

// Postgres devuelve los bigint como string: los datos de prueba lo reflejan
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
  status: QuoteStatus.PENDIENTE,
  ...overrides,
});

describe('OrdersService', () => {
  let service: OrdersService;

  // Empleado de PROYECTOS (1) y VENTAS (3)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  const createPoDto = { poNumber: 'OC-001', quoteId: 20, amount: 1500 };

  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((_entity: unknown, data: object) => data),
      save: jest.fn((data: object) => Promise.resolve({ id: '30', ...data })),
      update: jest.fn(),
    },
  };
  const mockDataSource = { createQueryRunner: jest.fn(() => queryRunner) };

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
    validateQuoteAprobed: jest.fn(),
  };

  beforeEach(async () => {
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
      mockCommonValidationService.validateQuoteAprobed.mockResolvedValue(
        buildQuote({ userId: '5' }),
      );

      // ACT
      const result = await service.create(createPoDto, employee);

      // ASSERT
      expect(result.message).toContain('OC-001');
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Quote,
        20,
        expect.objectContaining({ status: QuoteStatus.APROBADO }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should roll back when approving the quote fails', async () => {
      mockCommonValidationService.validateQuoteAprobed.mockResolvedValue(
        buildQuote({ userId: '5' }),
      );
      queryRunner.manager.update.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        'db down',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should forbid creating a PO for a quote of another user', async () => {
      mockCommonValidationService.validateQuoteAprobed.mockResolvedValue(
        buildQuote(),
      );

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should forbid a collaborator from creating the PO', async () => {
      mockCommonValidationService.validateQuoteAprobed.mockResolvedValue(
        buildQuote({ collaboratorId: '5' }),
      );

      await expect(service.create(createPoDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });

    it('should let the admin create a PO for any quote', async () => {
      mockCommonValidationService.validateQuoteAprobed.mockResolvedValue(
        buildQuote(),
      );

      await expect(service.create(createPoDto, admin)).resolves.toHaveProperty(
        'message',
      );
    });
  });

  describe('findAll', () => {
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
    const buildPo = (quoteOverrides: Record<string, unknown> = {}) => ({
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
      listQueryBuilder.getOne.mockResolvedValue(buildPo());

      await expect(service.findOne(30, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });

    it('should let the collaborator of the quote read the PO', async () => {
      listQueryBuilder.getOne.mockResolvedValue(
        buildPo({ collaboratorId: '5' }),
      );

      await expect(service.findOne(30, employee)).resolves.toBeDefined();
    });
  });
});
