import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuotesService } from './quotes.service';
import { Quote } from './entities/quote.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteStatus } from './interfaces/quote-status.enum';
import { CommonValidationService } from 'src/common/common-validation.service';
import { ExchangeRateService } from 'src/common/exchange-rate.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ClientAccessService } from 'src/common/access/client-access.service';
import { ClientAccessDeniedException } from 'src/common/access/access.exceptions';
import {
  DepartmentAccessDeniedException,
  ResourceOwnershipException,
  TargetUserNotInDepartmentException,
  InvalidCollaboratorException,
} from 'src/common/access/access.exceptions';
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

// Cotización completa (con relaciones) como la devuelve findOne
const buildQuote = (overrides: Record<string, unknown> = {}) => ({
  id: '20',
  quoteNumber: 'COT-0020',
  amount: '1500.00',
  currency: 'USD',
  status: QuoteStatus.PENDIENTE,
  userId: '8',
  departmentId: '3',
  clientId: '7',
  contactId: '3',
  collaboratorId: null,
  createdAt: new Date('2026-10-01'),
  user: { id: '8', codUser: 'C00008', firstName: 'Luis', lastName: 'Paz' },
  client: { id: '7', commercialName: 'ACME', ruc: '20544699939' },
  contact: null,
  collaborator: null,
  ...overrides,
});

describe('QuotesService', () => {
  let service: QuotesService;

  // Empleado de PROYECTOS (1) y VENTAS (3); admin de PROYECTOS (1) y DESARROLLO (2)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  const sumQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  const listQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    clone: jest.fn(() => sumQueryBuilder),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const mockQuoteRepository = {
    create: jest.fn((data: object) => data),
    save: jest.fn((data: object) =>
      Promise.resolve({ id: '99', createdAt: new Date(), ...data }),
    ),
    merge: jest.fn((entity: object, changes: object) => ({
      ...entity,
      ...changes,
    })),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(() => listQueryBuilder),
  };

  const mockCommonValidationService = {
    findClientById: jest.fn(),
    findContactClientById: jest.fn(),
  };

  const mockExchangeRateService = {
    getRates: jest.fn().mockResolvedValue({ USD: 1, PEN: 3.5 }),
  };

  const membershipQuery = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn(),
  };
  const mockUserDepartmentRepository = {
    createQueryBuilder: jest.fn(() => membershipQuery),
  };

  const createQuoteDto: CreateQuoteDto = {
    quoteNumber: 'COT-0100',
    clientId: 7,
    contactId: 3,
    departmentId: 3,
    amount: 2500,
    createdAt: new Date('2026-10-01'),
  };

  // El acceso a clientes tiene su propio spec: aquí solo importa que se consulte
  const mockClientAccessService = { assertOwnerCanAccessClient: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        AccessScopeService,
        { provide: ClientAccessService, useValue: mockClientAccessService },
        { provide: getRepositoryToken(Quote), useValue: mockQuoteRepository },
        {
          provide: getRepositoryToken(UserDepartment),
          useValue: mockUserDepartmentRepository,
        },
        {
          provide: CommonValidationService,
          useValue: mockCommonValidationService,
        },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);

    mockCommonValidationService.findClientById.mockResolvedValue({ id: '7' });
    mockCommonValidationService.findContactClientById.mockResolvedValue({
      id: '3',
      clientId: '7',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should reject a client outside the user portfolios', async () => {
      // ARRANGE
      mockClientAccessService.assertOwnerCanAccessClient.mockRejectedValueOnce(
        new ClientAccessDeniedException(7),
      );

      // ACT & ASSERT
      await expect(service.create(createQuoteDto, employee)).rejects.toThrow(
        ClientAccessDeniedException,
      );
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should register the quote for the authenticated user ignoring the userId sent', async () => {
      // ACT: el empleado intenta registrar la cotización a nombre del usuario 99
      const result = await service.create(
        { ...createQuoteDto, userId: 99 },
        employee,
      );

      // ASSERT
      expect(result.message).toContain('creada exitosamente');
      expect(mockQuoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5, departmentId: 3 }),
      );
    });

    it('should reject a quote in a department not assigned to the user', async () => {
      await expect(
        service.create({ ...createQuoteDto, departmentId: 2 }, employee),
      ).rejects.toThrow(DepartmentAccessDeniedException);
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should reject an admin registering for a user outside the department', async () => {
      membershipQuery.getExists.mockResolvedValue(false);

      await expect(
        service.create({ ...createQuoteDto, userId: 8 }, admin),
      ).rejects.toThrow(TargetUserNotInDepartmentException);
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should save a collaborator who is an active member of the department', async () => {
      // ARRANGE
      membershipQuery.getExists.mockResolvedValue(true);

      // ACT
      await service.create({ ...createQuoteDto, collaboratorId: 7 }, employee);

      // ASSERT
      expect(mockQuoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5, collaboratorId: 7 }),
      );
    });

    it('should reject a collaborator outside the department', async () => {
      membershipQuery.getExists.mockResolvedValue(false);

      await expect(
        service.create({ ...createQuoteDto, collaboratorId: 7 }, employee),
      ).rejects.toThrow(InvalidCollaboratorException);
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should reject the owner as collaborator', async () => {
      await expect(
        service.create({ ...createQuoteDto, collaboratorId: 5 }, employee),
      ).rejects.toThrow(InvalidCollaboratorException);
    });
  });

  describe('findAll', () => {
    it('should scope the list to own or collaborated quotes in the user departments', async () => {
      // ACT: sin filtros, como haría alguien llamando a la API directamente
      await service.findAll({ limit: 10, offset: 0 }, employee);

      // ASSERT
      expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(quote.userId = :scopeUserId OR quote.collaboratorId = :scopeUserId)',
        { scopeUserId: 5 },
      );
      expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
        'quote.departmentId IN (:...scopeDepartmentIds)',
        { scopeDepartmentIds: [1, 3] },
      );
    });

    it('should apply the scope before cloning so the USD total is scoped too', async () => {
      await service.findAll({ limit: 10, offset: 0 }, employee);

      const scopeCallOrder =
        listQueryBuilder.andWhere.mock.invocationCallOrder[0];
      const cloneCallOrder = listQueryBuilder.clone.mock.invocationCallOrder[0];
      expect(scopeCallOrder).toBeLessThan(cloneCallOrder);
    });

    it('should not restrict the list for admin', async () => {
      await service.findAll({ limit: 10, offset: 0 }, admin);

      expect(listQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should let a collaborator read the quote', async () => {
      mockQuoteRepository.findOne.mockResolvedValue(
        buildQuote({ collaboratorId: '5' }),
      );

      const result = await service.findOne(20, employee);

      expect(result.id).toBe(20);
    });

    it('should forbid reading a quote of another user', async () => {
      mockQuoteRepository.findOne.mockResolvedValue(buildQuote());

      await expect(service.findOne(20, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });
  });

  describe('update', () => {
    it('should forbid a collaborator from updating the quote', async () => {
      mockQuoteRepository.findOneBy.mockResolvedValue(
        buildQuote({ collaboratorId: '5' }),
      );

      await expect(
        service.update(20, { description: 'cambio' }, employee),
      ).rejects.toThrow(ResourceOwnershipException);
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should forbid moving an own quote to a department not assigned to the user', async () => {
      mockQuoteRepository.findOneBy.mockResolvedValue(
        buildQuote({ userId: '5' }),
      );

      await expect(
        service.update(20, { departmentId: 2 }, employee),
      ).rejects.toThrow(DepartmentAccessDeniedException);
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should let the owner update their quote', async () => {
      // ARRANGE
      const ownQuote = buildQuote({ userId: '5' });
      mockQuoteRepository.findOneBy.mockResolvedValue(ownQuote);
      mockQuoteRepository.findOne.mockResolvedValue(ownQuote);

      // ACT
      const result = await service.update(
        20,
        { description: 'cambio' },
        employee,
      );

      // ASSERT
      expect(result.message).toContain('actualizada exitosamente');
      expect(mockQuoteRepository.merge).toHaveBeenCalledWith(ownQuote, {
        description: 'cambio',
      });
    });

    it('should reject changing the collaborator to someone outside the department', async () => {
      mockQuoteRepository.findOneBy.mockResolvedValue(
        buildQuote({ userId: '5' }),
      );
      membershipQuery.getExists.mockResolvedValue(false);

      await expect(
        service.update(20, { collaboratorId: 9 }, employee),
      ).rejects.toThrow(InvalidCollaboratorException);
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should let the owner remove the collaborator with null', async () => {
      // ARRANGE
      const ownQuote = buildQuote({ userId: '5', collaboratorId: '7' });
      mockQuoteRepository.findOneBy.mockResolvedValue(ownQuote);
      mockQuoteRepository.findOne.mockResolvedValue(ownQuote);

      // ACT
      await service.update(
        20,
        { collaboratorId: null } as unknown as UpdateQuoteDto,
        employee,
      );

      // ASSERT: no valida nada al quitarlo
      expect(membershipQuery.getExists).not.toHaveBeenCalled();
      expect(mockQuoteRepository.merge).toHaveBeenCalledWith(ownQuote, {
        collaboratorId: null,
      });
    });

    it('should revalidate the current collaborator when the admin changes the owner', async () => {
      // ARRANGE: el colaborador actual (5) pasaría a ser también el dueño
      mockQuoteRepository.findOneBy.mockResolvedValue(
        buildQuote({ collaboratorId: '5' }),
      );
      membershipQuery.getExists.mockResolvedValue(true);

      // ACT & ASSERT
      await expect(service.update(20, { userId: 5 }, admin)).rejects.toThrow(
        InvalidCollaboratorException,
      );
    });
  });

  describe('remove (rechazar)', () => {
    const removeDto = { statusReason: 'El cliente desistió de la compra' };

    it('should forbid rejecting a quote of another user', async () => {
      mockQuoteRepository.findOneBy.mockResolvedValue(buildQuote());

      await expect(service.remove(20, removeDto, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(mockQuoteRepository.save).not.toHaveBeenCalled();
    });

    it('should let the admin reject any quote', async () => {
      mockQuoteRepository.findOneBy.mockResolvedValue(buildQuote());

      await service.remove(20, removeDto, admin);

      expect(mockQuoteRepository.merge).toHaveBeenCalledWith(
        expect.anything(),
        { status: QuoteStatus.RECHAZADO, statusReason: removeDto.statusReason },
      );
    });
  });
});
