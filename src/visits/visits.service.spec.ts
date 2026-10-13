import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VisitsService } from './visits.service';
import { Visit } from './entities/visit.entity';
import { CommonValidationService } from 'src/common/common-validation.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ClientAccessService } from 'src/common/access/client-access.service';
import { ClientAccessDeniedException } from 'src/common/access/access.exceptions';
import {
  DepartmentAccessDeniedException,
  ResourceOwnershipException,
} from 'src/common/access/access.exceptions';
import { User, UserDepartment } from 'src/users/entities';
import { Role } from 'src/users/interfaces';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitContactNotBelongToClientException } from './exceptions/visit.exceptions';

// Postgres devuelve los bigint como string: los datos de prueba lo reflejan
const buildUser = (id: string, role: Role, departmentIds: string[]): User =>
  ({
    id,
    role,
    userDepartments: departmentIds.map((deptId) => ({
      department: { id: deptId },
    })),
  }) as unknown as User;

const buildQueryBuilder = (result: [unknown[], number] = [[], 0]) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue(result),
  getOne: jest.fn(),
});

describe('VisitsService', () => {
  let service: VisitsService;

  // Empleado de PROYECTOS (1) y VENTAS (3); admin de PROYECTOS (1) y DESARROLLO (2)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  const ownVisit = {
    id: '10',
    userId: '5',
    departmentId: '3',
    clientId: '7',
  };
  const othersVisit = {
    id: '11',
    userId: '8',
    departmentId: '3',
    clientId: '7',
  };

  const mockVisitRepository = {
    create: jest.fn((data: object) => data),
    save: jest.fn((data: object) => Promise.resolve({ id: 99, ...data })),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCommonValidationService = {
    findClientById: jest.fn(),
    findContactClientById: jest.fn(),
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

  const createVisitDto: CreateVisitDto = {
    clientId: 7,
    contactId: 3,
    departmentId: 3,
    date: new Date('2026-10-01'),
    visitTopics: 'Revisión de propuesta',
    outcomeSummary: 'Cliente interesado',
  };

  // El acceso a clientes tiene su propio spec: aquí solo importa que se consulte
  const mockClientAccessService = { assertCanAccessClient: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitsService,
        AccessScopeService,
        { provide: ClientAccessService, useValue: mockClientAccessService },
        { provide: getRepositoryToken(Visit), useValue: mockVisitRepository },
        {
          provide: getRepositoryToken(UserDepartment),
          useValue: mockUserDepartmentRepository,
        },
        {
          provide: CommonValidationService,
          useValue: mockCommonValidationService,
        },
      ],
    }).compile();

    service = module.get<VisitsService>(VisitsService);

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
      mockClientAccessService.assertCanAccessClient.mockRejectedValueOnce(
        new ClientAccessDeniedException(7),
      );

      // ACT & ASSERT
      await expect(service.create(createVisitDto, employee)).rejects.toThrow(
        ClientAccessDeniedException,
      );
      expect(mockVisitRepository.save).not.toHaveBeenCalled();
    });

    it('should register the visit for the authenticated user ignoring the userId sent', async () => {
      // ARRANGE: el empleado intenta registrar la visita a nombre del usuario 99
      const dto = { ...createVisitDto, userId: 99 };

      // ACT
      const result = await service.create(dto, employee);

      // ASSERT
      expect(result.message).toContain('exitosamente');
      expect(mockVisitRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5, departmentId: 3 }),
      );
    });

    it('should reject a visit in a department not assigned to the user', async () => {
      const dto = { ...createVisitDto, departmentId: 2 };

      await expect(service.create(dto, employee)).rejects.toThrow(
        DepartmentAccessDeniedException,
      );
      expect(mockVisitRepository.save).not.toHaveBeenCalled();
    });

    it('should let the admin register a visit for an employee of the department', async () => {
      // ARRANGE
      membershipQuery.getExists.mockResolvedValue(true);

      // ACT
      await service.create({ ...createVisitDto, userId: 5 }, admin);

      // ASSERT
      expect(mockVisitRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5 }),
      );
    });

    it('should throw when the contact does not belong to the client', async () => {
      mockCommonValidationService.findContactClientById.mockResolvedValue({
        id: '3',
        clientId: '8',
      });

      await expect(service.create(createVisitDto, employee)).rejects.toThrow(
        VisitContactNotBelongToClientException,
      );
    });
  });

  describe('findAll', () => {
    it('should restrict the list to own visits in the user departments', async () => {
      // ARRANGE
      const qb = buildQueryBuilder();
      mockVisitRepository.createQueryBuilder.mockReturnValue(qb);

      // ACT: sin filtros, como haría alguien llamando a la API directamente
      await service.findAll({ limit: 10, offset: 0 }, employee);

      // ASSERT
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(visit.userId = :scopeUserId)',
        {
          scopeUserId: 5,
        },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'visit.departmentId IN (:...scopeDepartmentIds)',
        { scopeDepartmentIds: [1, 3] },
      );
    });

    it('should not restrict the list for admin', async () => {
      const qb = buildQueryBuilder();
      mockVisitRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ limit: 10, offset: 0 }, admin);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should keep optional filters on top of the scope', async () => {
      const qb = buildQueryBuilder();
      mockVisitRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { limit: 10, offset: 0, clientId: 7, departmentId: 3 },
        employee,
      );

      expect(qb.andWhere).toHaveBeenCalledWith('visit.clientId = :clientId', {
        clientId: 7,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'visit.departmentId = :departmentId',
        { departmentId: 3 },
      );
    });

    it('should return the paginated and mapped list', async () => {
      // ARRANGE
      const visit = {
        ...ownVisit,
        date: new Date('2026-10-01'),
        visitTopics: 'Temas',
        outcomeSummary: 'Resumen',
        contactId: '3',
        user: {
          id: '5',
          codUser: 'C00005',
          firstName: 'Ana',
          lastName: 'Ruiz',
        },
        client: { id: '7', commercialName: 'ACME', ruc: '20544699939' },
        contact: null,
      };
      mockVisitRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilder([[visit], 1]),
      );

      // ACT
      const result = await service.findAll({ limit: 10, offset: 0 }, employee);

      // ASSERT
      expect(result.data.total).toBe(1);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].contact).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return an own visit', async () => {
      const qb = buildQueryBuilder();
      qb.getOne.mockResolvedValue({ ...ownVisit, user: {}, client: {} });
      mockVisitRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne(10, employee)).resolves.toBeDefined();
    });

    it('should forbid reading a visit of another user', async () => {
      const qb = buildQueryBuilder();
      qb.getOne.mockResolvedValue({ ...othersVisit, user: {}, client: {} });
      mockVisitRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne(11, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });
  });

  describe('update', () => {
    it('should forbid updating a visit of another user', async () => {
      mockVisitRepository.findOne.mockResolvedValue(othersVisit);

      await expect(
        service.update(11, { visitTopics: 'cambio' }, employee),
      ).rejects.toThrow(ResourceOwnershipException);
      expect(mockVisitRepository.update).not.toHaveBeenCalled();
    });

    it('should forbid moving an own visit to a department not assigned to the user', async () => {
      mockVisitRepository.findOne.mockResolvedValue(ownVisit);

      await expect(
        service.update(10, { departmentId: 2 }, employee),
      ).rejects.toThrow(DepartmentAccessDeniedException);
      expect(mockVisitRepository.update).not.toHaveBeenCalled();
    });

    it('should not let a user reassign an own visit to someone else', async () => {
      // ARRANGE
      mockVisitRepository.findOne.mockResolvedValue(ownVisit);
      const qb = buildQueryBuilder();
      qb.getOne.mockResolvedValue({ ...ownVisit, user: {}, client: {} });
      mockVisitRepository.createQueryBuilder.mockReturnValue(qb);

      // ACT
      await service.update(10, { userId: 99, departmentId: 1 }, employee);

      // ASSERT: el dueño sigue siendo el empleado
      expect(mockVisitRepository.update).toHaveBeenCalledWith(10, {
        userId: 5,
        departmentId: 1,
      });
    });

    it('should accept a contact of the client when ids come as bigint strings', async () => {
      // ARRANGE: contact.clientId llega como '7' y el clientId de la visita también
      mockVisitRepository.findOne.mockResolvedValue(ownVisit);
      const qb = buildQueryBuilder();
      qb.getOne.mockResolvedValue({ ...ownVisit, user: {}, client: {} });
      mockVisitRepository.createQueryBuilder.mockReturnValue(qb);

      // ACT & ASSERT
      await expect(
        service.update(10, { clientId: 7, contactId: 3 }, employee),
      ).resolves.toHaveProperty('message');
    });
  });

  describe('remove', () => {
    it('should forbid deleting a visit of another user', async () => {
      mockVisitRepository.findOne.mockResolvedValue(othersVisit);

      await expect(service.remove(11, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(mockVisitRepository.delete).not.toHaveBeenCalled();
    });

    it('should let the admin delete any visit', async () => {
      mockVisitRepository.findOne.mockResolvedValue(othersVisit);

      await service.remove(11, admin);

      expect(mockVisitRepository.delete).toHaveBeenCalledWith(11);
    });
  });
});
