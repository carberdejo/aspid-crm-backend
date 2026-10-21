import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { AccessScopeService, OwnedResource } from './access-scope.service';
import {
  DepartmentAccessDeniedException,
  InvalidCollaboratorException,
  ResourceOwnershipException,
  TargetUserNotInDepartmentException,
} from './access.exceptions';
import { User, UserDepartment } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

// Postgres devuelve los bigint como string: los usuarios de prueba lo reflejan
const buildUser = (id: string, role: Role, departmentIds: string[]): User =>
  ({
    id,
    role,
    userDepartments: departmentIds.map((deptId) => ({
      department: { id: deptId },
    })),
  }) as unknown as User;

describe('AccessScopeService', () => {
  let service: AccessScopeService;

  // Usuario de VENTAS (3) y PROYECTOS (1)
  const employee = buildUser('5', Role.USER, ['1', '3']);
  const admin = buildUser('1', Role.ADMIN, ['1', '2']);

  const membershipQuery = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const mockUserDepartmentRepository = {
    createQueryBuilder: jest.fn(() => membershipQuery),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessScopeService,
        {
          provide: getRepositoryToken(UserDepartment),
          useValue: mockUserDepartmentRepository,
        },
      ],
    }).compile();

    service = module.get<AccessScopeService>(AccessScopeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDepartmentIds', () => {
    it('should return department ids as numbers', () => {
      expect(service.getDepartmentIds(employee)).toEqual([1, 3]);
    });

    it('should return an empty array when the user has no departments', () => {
      const withoutDepartments = buildUser('9', Role.USER, []);
      expect(service.getDepartmentIds(withoutDepartments)).toEqual([]);
    });
  });

  describe('assertDepartmentAccess', () => {
    it('should allow a department assigned to the user', () => {
      expect(() => service.assertDepartmentAccess(employee, 3)).not.toThrow();
    });

    it('should throw DepartmentAccessDeniedException for another department', () => {
      expect(() => service.assertDepartmentAccess(employee, 2)).toThrow(
        DepartmentAccessDeniedException,
      );
    });
  });

  describe('resolveOwner', () => {
    it('should ignore the requested userId when the current user is not admin', async () => {
      // ACT: el empleado intenta registrar a nombre del usuario 99
      const ownerId = await service.resolveOwner(employee, 3, 99);

      // ASSERT
      expect(ownerId).toBe(5);
      expect(membershipQuery.getExists).not.toHaveBeenCalled();
    });

    it('should reject a user registering in a department not assigned to them', async () => {
      await expect(service.resolveOwner(employee, 2)).rejects.toThrow(
        DepartmentAccessDeniedException,
      );
    });

    it('should register as the admin when no userId is requested', async () => {
      await expect(service.resolveOwner(admin, 2)).resolves.toBe(1);
    });

    it('should validate the admin own departments when registering for himself', async () => {
      await expect(service.resolveOwner(admin, 3)).rejects.toThrow(
        DepartmentAccessDeniedException,
      );
    });

    it('should let the admin register for another active user of the department', async () => {
      // ARRANGE
      membershipQuery.getExists.mockResolvedValue(true);

      // ACT
      const ownerId = await service.resolveOwner(admin, 3, 5);

      // ASSERT
      expect(ownerId).toBe(5);
      expect(membershipQuery.where).toHaveBeenCalledWith(
        'user.id = :memberId',
        {
          memberId: 5,
        },
      );
      expect(membershipQuery.andWhere).toHaveBeenCalledWith(
        'department.id = :departmentId',
        { departmentId: 3 },
      );
    });

    it('should throw TargetUserNotInDepartmentException when the target user does not belong to the department', async () => {
      membershipQuery.getExists.mockResolvedValue(false);

      await expect(service.resolveOwner(admin, 2, 5)).rejects.toThrow(
        TargetUserNotInDepartmentException,
      );
    });
  });

  describe('applyScope', () => {
    const buildQueryBuilder = () =>
      ({
        andWhere: jest.fn().mockReturnThis(),
      }) as unknown as SelectQueryBuilder<any> & { andWhere: jest.Mock };

    it('should not restrict the query for admin', () => {
      const qb = buildQueryBuilder();

      service.applyScope(qb, 'visit', admin);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should restrict to own records in the user departments', () => {
      const qb = buildQueryBuilder();

      service.applyScope(qb, 'visit', employee);

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

    it('should include reader fields such as the collaborator', () => {
      const qb = buildQueryBuilder();

      service.applyScope(qb, 'quote', employee, {
        readerFields: ['collaboratorId'],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(quote.userId = :scopeUserId OR quote.collaboratorId = :scopeUserId)',
        { scopeUserId: 5 },
      );
    });

    it('should return no rows when the user has no departments', () => {
      const qb = buildQueryBuilder();
      const withoutDepartments = buildUser('9', Role.USER, []);

      service.applyScope(qb, 'visit', withoutDepartments);

      expect(qb.andWhere).toHaveBeenCalledWith('1 = 0');
    });

    it('should include records without department when requested', () => {
      const qb = buildQueryBuilder();

      service.applyScope(qb, 'delivery', employee, {
        includeWithoutDepartment: true,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(delivery.departmentId IN (:...scopeDepartmentIds) OR delivery.departmentId IS NULL)',
        { scopeDepartmentIds: [1, 3] },
      );
    });
  });

  describe('assertCanRead / assertCanModify', () => {
    const ownVisit: OwnedResource = { id: 10, userId: 5, departmentId: 3 };
    const othersVisit: OwnedResource = { id: 11, userId: 8, departmentId: 3 };

    it('should let the owner read and modify a record in their department', () => {
      expect(() =>
        service.assertCanRead(ownVisit, employee, 'la visita'),
      ).not.toThrow();
      expect(() =>
        service.assertCanModify(ownVisit, employee, 'la visita'),
      ).not.toThrow();
    });

    it('should forbid reading or modifying a record of another user', () => {
      expect(() =>
        service.assertCanRead(othersVisit, employee, 'la visita'),
      ).toThrow(ResourceOwnershipException);
      expect(() =>
        service.assertCanModify(othersVisit, employee, 'la visita'),
      ).toThrow(ResourceOwnershipException);
    });

    it('should forbid the owner once they no longer belong to the department', () => {
      const visitInOldDepartment = { id: 12, userId: 5, departmentId: 2 };

      expect(() =>
        service.assertCanModify(visitInOldDepartment, employee, 'la visita'),
      ).toThrow(ResourceOwnershipException);
    });

    it('should let a collaborator read but not modify', () => {
      // ARRANGE: cotización del usuario 8 con el empleado 5 como colaborador
      const quote = { id: 20, userId: 8, departmentId: 3 };

      // ACT & ASSERT
      expect(() =>
        service.assertCanRead(quote, employee, 'la cotización', [5]),
      ).not.toThrow();
      expect(() =>
        service.assertCanModify(quote, employee, 'la cotización'),
      ).toThrow(ResourceOwnershipException);
    });

    it('should compare ids stored as bigint strings', () => {
      const quoteFromDb = { id: 21, userId: '5', departmentId: '3' };

      expect(() =>
        service.assertCanModify(
          quoteFromDb as unknown as OwnedResource,
          employee,
          'la cotización',
        ),
      ).not.toThrow();
    });

    it('should rely only on the owner for records without department', () => {
      const legacyDelivery = { id: 30, userId: 5, departmentId: null };

      expect(() =>
        service.assertCanModify(legacyDelivery, employee, 'la entrega'),
      ).not.toThrow();
    });

    it('should let the admin read and modify any record', () => {
      expect(() =>
        service.assertCanModify(othersVisit, admin, 'la visita'),
      ).not.toThrow();
    });
  });

  describe('assertValidCollaborator', () => {
    it('should accept an active member of the department other than the owner', async () => {
      membershipQuery.getExists.mockResolvedValue(true);

      await expect(
        service.assertValidCollaborator(7, 5, 3),
      ).resolves.toBeUndefined();
      expect(membershipQuery.where).toHaveBeenCalledWith(
        'user.id = :memberId',
        {
          memberId: 7,
        },
      );
    });

    it('should reject the owner as collaborator without querying', async () => {
      const error = await service
        .assertValidCollaborator(5, 5, 3)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(InvalidCollaboratorException);
      expect((error as InvalidCollaboratorException).code).toBe(135);
      expect(membershipQuery.getExists).not.toHaveBeenCalled();
    });

    it('should reject an inactive user or one outside the department', async () => {
      membershipQuery.getExists.mockResolvedValue(false);

      await expect(service.assertValidCollaborator(7, 5, 3)).rejects.toThrow(
        InvalidCollaboratorException,
      );
    });
  });

  describe('findDepartmentMembers', () => {
    const memberships = [
      {
        user: { id: '5', codUser: 'C001', firstName: 'Ana', lastName: 'Ruiz' },
      },
    ];

    it('should list the active members of an own department', async () => {
      membershipQuery.getMany.mockResolvedValue(memberships);

      const result = await service.findDepartmentMembers(employee, 3);

      expect(result).toEqual([
        { id: 5, codUser: 'C001', fullName: 'Ana Ruiz' },
      ]);
      expect(membershipQuery.andWhere).toHaveBeenCalledWith(
        'user.isActive = true',
      );
    });

    it('should forbid a user to list another department', async () => {
      await expect(service.findDepartmentMembers(employee, 2)).rejects.toThrow(
        DepartmentAccessDeniedException,
      );
      expect(membershipQuery.getMany).not.toHaveBeenCalled();
    });

    it('should let the admin list any department', async () => {
      membershipQuery.getMany.mockResolvedValue([]);

      await expect(service.findDepartmentMembers(admin, 3)).resolves.toEqual(
        [],
      );
    });
  });
});
