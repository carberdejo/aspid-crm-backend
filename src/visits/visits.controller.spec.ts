import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { Visit } from './entities/visit.entity';
import { User } from '../users/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { ContactClient } from '../clients/entities/contact-client.entity';
import { Department } from '../departments/entities/department.entity';
import { QueryVisitDto } from './dto/query-visit.dto';

describe('VisitsController', () => {
  let controller: VisitsController;
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
      controllers: [VisitsController],
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

    controller = module.get<VisitsController>(VisitsController);
    service = module.get<VisitsService>(VisitsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with query params', async () => {
      // ARRANGE
      const queryDto: QueryVisitDto = { limit: 10, offset: 0 };
      const expectedResponse = {
        data: {
          items: [
            {
              id: 7,
              date: new Date('2026-04-15'),
              visitTopics: 'Test',
              outcomeSummary: 'Test summary',
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
          ],
          total: 1,
          limit: 10,
          offset: 0,
        },
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResponse);

      // ACT
      const result = await controller.findAll(queryDto);

      // ASSERT
      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResponse);
      expect(result.data.items[0]).not.toHaveProperty('user.email');
      expect(result.data.items[0]).not.toHaveProperty('client.businessName');
    });

    it('should return optimized response with limited relationship fields', async () => {
      // ARRANGE
      const queryDto: QueryVisitDto = { limit: 5, offset: 0, clientId: 1 };
      const mockResponse = {
        data: {
          items: [],
          total: 0,
          limit: 5,
          offset: 0,
        },
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockResponse);

      // ACT
      const result = await controller.findAll(queryDto);

      // ASSERT
      expect(result.data.limit).toBe(5);
      expect(result.data.items).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });
  });
});
