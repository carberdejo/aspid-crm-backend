import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliverysService } from './deliverys.service';
import { Delivery } from './entities/delivery.entity';
import { DeliveryNotFoundException } from './exceptions/delivery.exceptions';
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

// Postgres devuelve los bigint como string: los datos de prueba lo reflejan
const buildUser = (id: string, role: Role, departmentIds: string[]): User =>
  ({
    id,
    role,
    userDepartments: departmentIds.map((deptId) => ({
      department: { id: deptId },
    })),
  }) as unknown as User;

describe('DeliverysService', () => {
  let service: DeliverysService;

  // Empleado de PROYECTOS (1) y VENTAS (3)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  const ownDelivery = {
    id: '40',
    userId: '5',
    departmentId: '3',
    clientId: '7',
  };
  const othersDelivery = {
    id: '41',
    userId: '8',
    departmentId: '3',
    clientId: '7',
  };
  const legacyDelivery = {
    id: '42',
    userId: '5',
    departmentId: null,
    clientId: null,
  };

  const queryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn(),
  };

  const mockDeliveryRepository = {
    create: jest.fn((data: object) => ({ id: '99', ...data })),
    save: jest.fn((data: object) => Promise.resolve(data)),
    merge: jest.fn((entity: object, changes: object) => ({
      ...entity,
      ...changes,
    })),
    findOneBy: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  const mockValidationService = { findClientById: jest.fn() };

  // El acceso a clientes tiene su propio spec: aquí solo importa que se consulte
  const mockClientAccessService = { assertOwnerCanAccessClient: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliverysService,
        AccessScopeService,
        { provide: ClientAccessService, useValue: mockClientAccessService },
        {
          provide: getRepositoryToken(Delivery),
          useValue: mockDeliveryRepository,
        },
        { provide: getRepositoryToken(UserDepartment), useValue: {} },
        { provide: CommonValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<DeliverysService>(DeliverysService);
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
      await expect(
        service.create({ departmentId: 3, clientId: 7 }, employee),
      ).rejects.toThrow(ClientAccessDeniedException);
      expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
    });

    it('should register the delivery for the authenticated user in their department', async () => {
      // ACT: el empleado intenta registrar a nombre del usuario 99
      const result = await service.create(
        { departmentId: 3, clientId: 7, userId: 99 },
        employee,
      );

      // ASSERT
      expect(result.message).toContain('exitosamente');
      expect(mockDeliveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5, departmentId: 3, clientId: 7 }),
      );
      expect(mockValidationService.findClientById).toHaveBeenCalledWith(7);
    });

    it('should save without client when clientId is 0', async () => {
      await service.create({ departmentId: 3, clientId: 0 }, employee);

      expect(mockDeliveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: null }),
      );
      expect(mockValidationService.findClientById).not.toHaveBeenCalled();
    });

    it('should reject a delivery in a department not assigned to the user', async () => {
      await expect(
        service.create({ departmentId: 2 }, employee),
      ).rejects.toThrow(DepartmentAccessDeniedException);
      expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should scope the list including legacy deliveries without department', async () => {
      await service.findAll({ limit: 10, offset: 0 }, employee);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(delivery.userId = :scopeUserId)',
        { scopeUserId: 5 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(delivery.departmentId IN (:...scopeDepartmentIds) OR delivery.departmentId IS NULL)',
        { scopeDepartmentIds: [1, 3] },
      );
    });

    it('should paginate and apply filters', async () => {
      // ACT
      const result = await service.findAll(
        { limit: 5, offset: 10, departmentId: 3, term: 'ANDINA' },
        admin,
      );

      // ASSERT
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'delivery.departmentId = :departmentId',
        { departmentId: 3 },
      );
      expect(result.data).toEqual({
        items: [],
        total: 0,
        limit: 5,
        offset: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should throw DeliveryNotFoundException when it does not exist', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(404, employee)).rejects.toThrow(
        DeliveryNotFoundException,
      );
    });

    it('should forbid reading a delivery of another user', async () => {
      queryBuilder.getOne.mockResolvedValue(othersDelivery);

      await expect(service.findOne(41, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
    });

    it('should let the owner read a legacy delivery without department', async () => {
      queryBuilder.getOne.mockResolvedValue(legacyDelivery);

      await expect(service.findOne(42, employee)).resolves.toBe(legacyDelivery);
    });
  });

  describe('update', () => {
    it('should forbid updating a delivery of another user', async () => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(othersDelivery);

      await expect(
        service.update(41, { deliveryDate: '2026-10-08' }, employee),
      ).rejects.toThrow(ResourceOwnershipException);
      expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
    });

    it('should remove the client of an own delivery when clientId is 0', async () => {
      // ARRANGE
      mockDeliveryRepository.findOneBy.mockResolvedValue(ownDelivery);
      queryBuilder.getOne.mockResolvedValue({ ...ownDelivery, clientId: null });

      // ACT
      await service.update(40, { clientId: 0 }, employee);

      // ASSERT: el dueño y el área no cambian, el cliente queda en NULL
      expect(mockDeliveryRepository.merge).toHaveBeenCalledWith(ownDelivery, {
        clientId: null,
      });
      expect(mockValidationService.findClientById).not.toHaveBeenCalled();
    });

    it('should let the owner assign a department to a legacy delivery', async () => {
      // ARRANGE
      mockDeliveryRepository.findOneBy.mockResolvedValue(legacyDelivery);
      queryBuilder.getOne.mockResolvedValue({
        ...legacyDelivery,
        departmentId: '3',
      });

      // ACT
      const result = await service.update(42, { departmentId: 3 }, employee);

      // ASSERT
      expect(result.message).toContain('exitosamente');
      expect(mockDeliveryRepository.merge).toHaveBeenCalledWith(
        legacyDelivery,
        {
          departmentId: 3,
          userId: 5,
        },
      );
    });
  });

  describe('remove', () => {
    it('should forbid deleting a delivery of another user', async () => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(othersDelivery);

      await expect(service.remove(41, employee)).rejects.toThrow(
        ResourceOwnershipException,
      );
      expect(mockDeliveryRepository.update).not.toHaveBeenCalled();
    });

    it('should let the admin soft-delete any delivery, recording who deleted it', async () => {
      mockDeliveryRepository.findOneBy.mockResolvedValue(othersDelivery);

      await service.remove(41, admin);

      expect(mockDeliveryRepository.update).toHaveBeenCalledWith(41, {
        deletedAt: expect.any(Function) as () => string,
        deletedBy: admin.id,
      });
      expect(mockDeliveryRepository.remove).not.toHaveBeenCalled();
    });

    it('should not find a delivery that was already deleted', async () => {
      // findOneBy excluye las eliminadas lógicamente, así que no la encuentra
      mockDeliveryRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(41, admin)).rejects.toThrow(
        DeliveryNotFoundException,
      );
      expect(mockDeliveryRepository.update).not.toHaveBeenCalled();
    });
  });
});
