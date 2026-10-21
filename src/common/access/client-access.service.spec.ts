import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brackets, SelectQueryBuilder } from 'typeorm';
import { ClientAccessService } from './client-access.service';
import {
  ClientAccessDeniedException,
  PortfolioNotAssignedException,
} from './access.exceptions';
import { PortfolioUser } from 'src/portfolios/entities/portfolio-user.entity';
import { UserClientException } from 'src/clients/entities/user-client-exception.entity';
import { Client } from 'src/clients/entities';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';
import { UsersNotFoundException } from 'src/users/exceptions/users.exceptions';

// Postgres devuelve los bigint como string: los datos de prueba lo reflejan
const employee = { id: '5', role: Role.USER } as unknown as User;
const admin = { id: '1', role: Role.ADMIN } as unknown as User;

describe('ClientAccessService', () => {
  let service: ClientAccessService;

  // Cartera 10 asignada al empleado
  const mockPortfolioUserRepository = {
    find: jest.fn(),
  };
  const mockClientExceptionRepository = {
    exists: jest.fn(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAccessService,
        {
          provide: getRepositoryToken(PortfolioUser),
          useValue: mockPortfolioUserRepository,
        },
        {
          provide: getRepositoryToken(UserClientException),
          useValue: mockClientExceptionRepository,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<ClientAccessService>(ClientAccessService);

    mockPortfolioUserRepository.find.mockResolvedValue([
      { portfolioId: '10', userId: '5' },
    ]);
    mockClientExceptionRepository.exists.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canAccessClient', () => {
    it('should give the admin access to any client without querying', async () => {
      // ACT
      const result = await service.canAccessClient(admin, {
        id: 7,
        portfolioId: 99,
      });

      // ASSERT
      expect(result).toBe(true);
      expect(mockPortfolioUserRepository.find).not.toHaveBeenCalled();
    });

    it('should give access to a client of one of the user portfolios', async () => {
      const result = await service.canAccessClient(employee, {
        id: 7,
        portfolioId: '10' as unknown as number,
      });

      expect(result).toBe(true);
      expect(mockClientExceptionRepository.exists).not.toHaveBeenCalled();
    });

    it('should give access through an active exception outside the user portfolios', async () => {
      // ARRANGE
      mockClientExceptionRepository.exists.mockResolvedValue(true);

      // ACT
      const result = await service.canAccessClient(employee, {
        id: 7,
        portfolioId: 99,
      });

      // ASSERT: solo cuentan las excepciones activas de ese usuario y cliente
      expect(result).toBe(true);
      expect(mockClientExceptionRepository.exists).toHaveBeenCalledWith({
        where: { userId: '5', clientId: 7, isActive: true },
      });
    });

    it('should deny a client outside the portfolios and without exception', async () => {
      await expect(
        service.canAccessClient(employee, { id: 7, portfolioId: 99 }),
      ).resolves.toBe(false);
    });

    it('should only check exceptions for a client without portfolio', async () => {
      await service.canAccessClient(employee, { id: 7, portfolioId: null });

      expect(mockPortfolioUserRepository.find).not.toHaveBeenCalled();
      expect(mockClientExceptionRepository.exists).toHaveBeenCalled();
    });
  });

  describe('assertCanAccessClient', () => {
    it('should throw ClientAccessDeniedException (133) without access', async () => {
      const error = await service
        .assertCanAccessClient(employee, { id: 7, portfolioId: 99 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ClientAccessDeniedException);
      expect((error as ClientAccessDeniedException).code).toBe(133);
    });

    it('should pass with access', async () => {
      await expect(
        service.assertCanAccessClient(employee, { id: 7, portfolioId: 10 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertOwnerCanAccessClient', () => {
    it('should check the requester when the owner is the requester', async () => {
      await expect(
        service.assertOwnerCanAccessClient(employee, 5, {
          id: 7,
          portfolioId: 99,
        }),
      ).rejects.toThrow(ClientAccessDeniedException);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should forbid the admin to register a client outside the owner portfolios', async () => {
      // ARRANGE: el admin registra a nombre del empleado 5 un cliente de la cartera 99
      mockUserRepository.findOne.mockResolvedValue(employee);

      // ACT & ASSERT
      await expect(
        service.assertOwnerCanAccessClient(admin, 5, {
          id: 7,
          portfolioId: 99,
        }),
      ).rejects.toThrow(ClientAccessDeniedException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } }),
      );
    });

    it('should let the admin register a client of the owner portfolios', async () => {
      mockUserRepository.findOne.mockResolvedValue(employee);

      await expect(
        service.assertOwnerCanAccessClient(admin, 5, {
          id: 7,
          portfolioId: 10,
        }),
      ).resolves.toBeUndefined();
    });

    it('should let the admin register for another admin with any client', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: '2',
        role: Role.ADMIN,
      });

      await expect(
        service.assertOwnerCanAccessClient(admin, 2, {
          id: 7,
          portfolioId: 99,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('resolveScopeUser', () => {
    it('should ignore the requested user for role user', async () => {
      await expect(service.resolveScopeUser(employee, 9)).resolves.toBe(
        employee,
      );
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return the admin itself without a requested user', async () => {
      await expect(service.resolveScopeUser(admin)).resolves.toBe(admin);
    });

    it('should load the user requested by the admin', async () => {
      mockUserRepository.findOne.mockResolvedValue(employee);

      await expect(service.resolveScopeUser(admin, 5)).resolves.toBe(employee);
    });

    it('should throw UsersNotFoundException (20) for an unknown user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveScopeUser(admin, 404)).rejects.toThrow(
        UsersNotFoundException,
      );
    });
  });

  describe('assertPortfolioAssigned', () => {
    it('should let the admin use any portfolio', async () => {
      await expect(
        service.assertPortfolioAssigned(admin, 99),
      ).resolves.toBeUndefined();
    });

    it('should let the user use an assigned portfolio', async () => {
      await expect(
        service.assertPortfolioAssigned(employee, 10),
      ).resolves.toBeUndefined();
    });

    it('should throw PortfolioNotAssignedException (134) for another portfolio', async () => {
      const error = await service
        .assertPortfolioAssigned(employee, 99)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(PortfolioNotAssignedException);
      expect((error as PortfolioNotAssignedException).code).toBe(134);
    });
  });

  describe('applyClientScope', () => {
    const buildQueryBuilder = () => {
      const subQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('(subquery)'),
      };
      return {
        subQuery: jest.fn(() => subQuery),
        andWhere: jest.fn().mockReturnThis(),
      };
    };

    it('should not restrict the admin', () => {
      const qb = buildQueryBuilder();

      service.applyClientScope(
        qb as unknown as SelectQueryBuilder<Client>,
        'client',
        admin,
      );

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should restrict the user to portfolios OR active exceptions', () => {
      const qb = buildQueryBuilder();

      service.applyClientScope(
        qb as unknown as SelectQueryBuilder<Client>,
        'client',
        employee,
      );

      // Una subconsulta para las carteras y otra para las excepciones
      expect(qb.subQuery).toHaveBeenCalledTimes(2);
      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), {
        scopeClientUserId: 5,
      });
    });
  });
});
