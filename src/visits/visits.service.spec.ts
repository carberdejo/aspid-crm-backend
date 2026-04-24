import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VisitsService } from './visits.service';
import { Visit } from './entities/visit.entity';
import { User } from '../users/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { ContactClient } from '../clients/entities/contact-client.entity';
import { Department } from '../departments/entities/department.entity';
import { QueryVisitDto } from './dto/query-visit.dto';

describe('VisitsService', () => {
  let service: VisitsService;

  // Define mocks
  const mockVisitRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockClientRepository = {
    findOne: jest.fn(),
  };

  const mockContactClientRepository = {
    findOne: jest.fn(),
  };

  const mockDepartmentRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitsService,
        {
          provide: getRepositoryToken(Visit),
          useValue: mockVisitRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(ContactClient),
          useValue: mockContactClientRepository,
        },
        {
          provide: getRepositoryToken(Department),
          useValue: mockDepartmentRepository,
        },
      ],
    }).compile();

    service = module.get<VisitsService>(VisitsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return optimized visit list without full relationships', async () => {
      // ARRANGE
      const mockVisits = [
        {
          id: 7,
          date: new Date('2026-04-15'),
          visitTopics: 'dfdfdf',
          outcomeSummary: 'dfdfdfdf',
          departmentId: 1,
          userId: 4,
          clientId: 1,
          contactId: 3,
          user: {
            id: 4,
            codUser: '2026002',
            firstName: 'Carlos',
            lastName: 'Berdejo',
          },
          client: {
            id: 1,
            commercialName: 'ACME Soluciones',
            ruc: '20544699939',
          },
          contact: {
            id: 3,
            firstName: 'JOSE',
            lastName: 'ROJAS',
            position: 'GERENTE',
          },
        },
      ];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockVisits, 1]),
      };

      mockVisitRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const queryDto: QueryVisitDto = { limit: 10, offset: 0 };

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('limit');
      expect(result.data).toHaveProperty('offset');
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);

      // Verify optimized fields (should NOT include email, isActive, role, etc from user)
      const item = result.data.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('date');
      expect(item).toHaveProperty('visitTopics');
      expect(item).toHaveProperty('outcomeSummary');
      expect(item).toHaveProperty('user');
      expect(item).toHaveProperty('client');
      expect(item).toHaveProperty('contact');

      // Verify user summary has limited fields
      expect(item.user).toEqual({
        id: 4,
        codUser: '2026002',
        firstName: 'Carlos',
        lastName: 'Berdejo',
      });
      expect(item.user).not.toHaveProperty('email');
      expect(item.user).not.toHaveProperty('isActive');

      // Verify client summary has only essential fields
      expect(item.client).toEqual({
        id: 1,
        commercialName: 'ACME Soluciones',
        ruc: '20544699939',
      });
      expect(item.client).not.toHaveProperty('businessName');
      expect(item.client).not.toHaveProperty('address');
    });

    it('should handle contacts as null when not present', async () => {
      // ARRANGE
      const mockVisits = [
        {
          id: 10,
          date: new Date('2026-04-15'),
          visitTopics: 'Test',
          outcomeSummary: 'Test summary',
          departmentId: 1,
          userId: 4,
          clientId: 1,
          contactId: null,
          user: {
            id: 4,
            codUser: '2026002',
            firstName: 'Carlos',
            lastName: 'Berdejo',
          },
          client: {
            id: 1,
            commercialName: 'ACME Soluciones',
            ruc: '20544699939',
          },
          contact: null,
        },
      ];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockVisits, 1]),
      };

      mockVisitRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // ACT
      const result = await service.findAll({ limit: 10, offset: 0 });

      // ASSERT
      expect(result.data.items[0].contact).toBeNull();
    });

    it('should apply clientId filter correctly', async () => {
      // ARRANGE
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockVisitRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const queryDto: QueryVisitDto = { limit: 10, offset: 0, clientId: 1 };

      // ACT
      await service.findAll(queryDto);

      // ASSERT
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'visit.client_id = :clientId',
        { clientId: 1 },
      );
    });

    it('should apply date range filters correctly', async () => {
      // ARRANGE
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockVisitRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const startDate = new Date('2026-04-01');
      const endDate = new Date('2026-04-30');
      const queryDto: QueryVisitDto = {
        limit: 10,
        offset: 0,
        startDate,
        endDate,
      };

      // ACT
      await service.findAll(queryDto);

      // ASSERT
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'visit.date >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'visit.date <= :endDate',
        { endDate },
      );
    });
  });
});
