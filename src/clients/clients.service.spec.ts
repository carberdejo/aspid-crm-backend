import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Brackets } from 'typeorm';
import { ClientsService } from './clients.service';
import { Client, ContactClient } from './entities';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContactClientDto } from './dto';
import { QueryClientDto } from './dto/query-client.dto';
import { ApiException } from 'src/common/exceptions/api.exception';
import { ClientAccessService } from 'src/common/access/client-access.service';
import {
  ClientAccessDeniedException,
  PortfolioNotAssignedException,
} from 'src/common/access/access.exceptions';
import { Portfolio } from 'src/portfolios/entities/portfolio.entity';
import { IndustrySegment } from 'src/catalogs/entities/industry-segment.entity';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

const employee = { id: '5', role: Role.USER } as unknown as User;
const admin = { id: '1', role: Role.ADMIN } as unknown as User;

describe('ClientsService', () => {
  let service: ClientsService;

  // Define mocks
  const mockClientRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockContactClientRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  // Las reglas de acceso tienen su propio spec: aquí solo importa que se apliquen
  const mockClientAccessService = {
    applyClientScope: jest.fn(),
    assertCanAccessClient: jest.fn(),
    assertPortfolioAssigned: jest.fn(),
    // Por defecto el alcance es el del usuario autenticado
    resolveScopeUser: jest.fn((user: unknown) => Promise.resolve(user)),
  };

  const createClientDto = {
    ruc: '20123456789',
    businessName: 'Test Company SAC',
    commercialName: 'Test Company',
    address: 'Av. Test 123',
    segmentId: 1,
    portfolioId: 10,
  } as CreateClientDto;

  const contactData: CreateContactClientDto = {
    clientId: 1,
    firstName: 'John',
    lastName: 'Doe',
    position: 'Manager',
    phone: '987654321',
    countryCode: '51',
    email: 'john.doe@test.com',
  };

  const buildListQueryBuilder = (result: [unknown[], number]) => ({
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    loadRelationCountAndMap: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  });

  const buildDetailQueryBuilder = (client: unknown) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(client),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(ContactClient),
          useValue: mockContactClientRepository,
        },
        { provide: getRepositoryToken(IndustrySegment), useValue: {} },
        { provide: getRepositoryToken(Portfolio), useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: ClientAccessService, useValue: mockClientAccessService },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a client successfully', async () => {
      // ARRANGE
      const savedClient = { id: 1, ...createClientDto };
      mockClientRepository.findOneBy.mockResolvedValue(null);
      mockClientRepository.create.mockReturnValue(createClientDto);
      mockClientRepository.save.mockResolvedValue(savedClient);

      // ACT
      const result = await service.create(createClientDto, employee);

      // ASSERT
      expect(result.data.message).toContain('exitosamente');
      expect(result.data.item).toEqual(savedClient);
      expect(
        mockClientAccessService.assertPortfolioAssigned,
      ).toHaveBeenCalledWith(employee, 10);
    });

    it('should reject a client in a portfolio not assigned to the user', async () => {
      // ARRANGE
      mockClientAccessService.assertPortfolioAssigned.mockRejectedValueOnce(
        new PortfolioNotAssignedException(10),
      );

      // ACT & ASSERT
      await expect(service.create(createClientDto, employee)).rejects.toThrow(
        PortfolioNotAssignedException,
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException when RUC already exists', async () => {
      mockClientRepository.findOneBy.mockResolvedValue({
        id: 1,
        ruc: createClientDto.ruc,
      });

      await expect(service.create(createClientDto, employee)).rejects.toThrow(
        ApiException,
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });

    it('should propagate database errors', async () => {
      mockClientRepository.findOneBy.mockResolvedValue(null);
      mockClientRepository.create.mockReturnValue(createClientDto);
      mockClientRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createClientDto, employee)).rejects.toThrow(
        'Database error',
      );
    });
  });

  // Solo el admin llega aquí: el controlador restringe PATCH /clients/:id
  describe('update', () => {
    const existingClient = {
      id: 1,
      ruc: '20123456789',
      businessName: 'Old Company SAC',
    };

    it('should update a client successfully', async () => {
      // ARRANGE
      const updateClientDto: UpdateClientDto = {
        businessName: 'Updated Company SAC',
      };
      const updatedClient = { ...existingClient, ...updateClientDto };
      mockClientRepository.findOneBy.mockResolvedValueOnce(existingClient);
      mockClientRepository.save.mockResolvedValue(updatedClient);

      // ACT
      const result = await service.update(1, updateClientDto);

      // ASSERT
      expect(result.message).toContain('actualizado exitosamente');
      expect(result.data).toEqual(updatedClient);
    });

    it('should throw ApiException when client not found', async () => {
      mockClientRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, { businessName: 'X' })).rejects.toThrow(
        ApiException,
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException when updating to duplicate RUC', async () => {
      mockClientRepository.findOneBy
        .mockResolvedValueOnce(existingClient)
        .mockResolvedValueOnce({ id: 2, ruc: '20999888777' });

      await expect(service.update(1, { ruc: '20999888777' })).rejects.toThrow(
        ApiException,
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated clients within the user scope', async () => {
      // ARRANGE
      const clients = [
        { id: 1, ruc: '20123456789', businessName: 'Company 1' },
        { id: 2, ruc: '20987654321', businessName: 'Company 2' },
      ];
      const qb = buildListQueryBuilder([clients, 2]);
      mockClientRepository.createQueryBuilder.mockReturnValue(qb);

      // ACT
      const result = await service.findAll(
        { limit: 10, offset: 0 } as QueryClientDto,
        employee,
      );

      // ASSERT
      expect(result.data).toEqual({
        items: clients,
        total: 2,
        limit: 10,
        offset: 0,
      });
      expect(mockClientAccessService.applyClientScope).toHaveBeenCalledWith(
        qb,
        'client',
        employee,
      );
      expect(
        mockClientAccessService.assertPortfolioAssigned,
      ).not.toHaveBeenCalled();
    });

    it('should apply the scope of the user requested by the admin', async () => {
      // ARRANGE: el admin pide los clientes que puede usar el empleado
      const qb = buildListQueryBuilder([[], 0]);
      mockClientRepository.createQueryBuilder.mockReturnValue(qb);
      mockClientAccessService.resolveScopeUser.mockResolvedValueOnce(employee);

      // ACT
      await service.findAll(
        { userId: 5, portfolioId: 10 } as QueryClientDto,
        admin,
      );

      // ASSERT: cartera y alcance se validan como el empleado
      expect(mockClientAccessService.resolveScopeUser).toHaveBeenCalledWith(
        admin,
        5,
      );
      expect(
        mockClientAccessService.assertPortfolioAssigned,
      ).toHaveBeenCalledWith(employee, 10);
      expect(mockClientAccessService.applyClientScope).toHaveBeenCalledWith(
        qb,
        'client',
        employee,
      );
    });

    it('should search by name or RUC with a single term', async () => {
      const qb = buildListQueryBuilder([[], 0]);
      mockClientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { term: '2012', limit: 10, offset: 0 } as QueryClientDto,
        employee,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets));
    });

    it('should only allow filtering by a portfolio assigned to the user', async () => {
      // ARRANGE
      mockClientRepository.createQueryBuilder.mockReturnValue(
        buildListQueryBuilder([[], 0]),
      );
      mockClientAccessService.assertPortfolioAssigned.mockRejectedValueOnce(
        new PortfolioNotAssignedException(99),
      );

      // ACT & ASSERT
      await expect(
        service.findAll(
          { portfolioId: 99, limit: 10, offset: 0 } as QueryClientDto,
          employee,
        ),
      ).rejects.toThrow(PortfolioNotAssignedException);
    });
  });

  describe('createContact', () => {
    it('should create a contact successfully', async () => {
      // ARRANGE
      const client = { id: 1, portfolioId: 10 };
      const savedContact = { id: 1, ...contactData };
      mockClientRepository.findOneBy.mockResolvedValue(client);
      mockContactClientRepository.create.mockReturnValue(contactData);
      mockContactClientRepository.save.mockResolvedValue(savedContact);

      // ACT
      const result = await service.createContact(contactData, employee);

      // ASSERT
      expect(result.data.message).toContain('exitosamente');
      expect(result.data.item).toEqual(savedContact);
      expect(
        mockClientAccessService.assertCanAccessClient,
      ).toHaveBeenCalledWith(employee, client);
    });

    it('should reject a contact for a client without access', async () => {
      mockClientRepository.findOneBy.mockResolvedValue({ id: 1 });
      mockClientAccessService.assertCanAccessClient.mockRejectedValueOnce(
        new ClientAccessDeniedException(1),
      );

      await expect(
        service.createContact(contactData, employee),
      ).rejects.toThrow(ClientAccessDeniedException);
      expect(mockContactClientRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException when client not found', async () => {
      mockClientRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.createContact({ ...contactData, clientId: 999 }, employee),
      ).rejects.toThrow(ApiException);
      expect(mockContactClientRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findClientContacts', () => {
    it('should return all contacts for a client', async () => {
      // ARRANGE
      const contacts = [{ id: 1, clientId: 1, firstName: 'John' }];
      mockClientRepository.findOneBy.mockResolvedValue({ id: 1 });
      mockContactClientRepository.find.mockResolvedValue(contacts);

      // ACT
      const result = await service.findClientContacts(1, employee);

      // ASSERT
      expect(result.data).toEqual(contacts);
      expect(result.total).toBe(1);
    });

    it('should reject the contacts of a client without access', async () => {
      mockClientRepository.findOneBy.mockResolvedValue({ id: 1 });
      mockClientAccessService.assertCanAccessClient.mockRejectedValueOnce(
        new ClientAccessDeniedException(1),
      );

      await expect(service.findClientContacts(1, employee)).rejects.toThrow(
        ClientAccessDeniedException,
      );
      expect(mockContactClientRepository.find).not.toHaveBeenCalled();
    });

    it('should throw ApiException when client not found', async () => {
      mockClientRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findClientContacts(999, employee)).rejects.toThrow(
        ApiException,
      );
      expect(mockContactClientRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findOneContact', () => {
    const contact = {
      id: 1,
      clientId: 1,
      firstName: 'John',
      client: { id: 1, portfolioId: 10 },
    };

    it('should return a contact by ID', async () => {
      mockContactClientRepository.findOne.mockResolvedValue(contact);

      const result = await service.findOneContact(1, employee);

      expect(result.data).toEqual(contact);
      expect(
        mockClientAccessService.assertCanAccessClient,
      ).toHaveBeenCalledWith(employee, contact.client);
    });

    it('should reject a contact of a client without access', async () => {
      mockContactClientRepository.findOne.mockResolvedValue(contact);
      mockClientAccessService.assertCanAccessClient.mockRejectedValueOnce(
        new ClientAccessDeniedException(1),
      );

      await expect(service.findOneContact(1, employee)).rejects.toThrow(
        ClientAccessDeniedException,
      );
    });

    it('should throw ApiException when contact not found', async () => {
      mockContactClientRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneContact(999, employee)).rejects.toThrow(
        ApiException,
      );
    });
  });

  describe('findByID', () => {
    const client = { id: 1, portfolioId: 10, contacts: [] };

    it('should return a client by ID with contacts', async () => {
      // ARRANGE
      const qb = buildDetailQueryBuilder(client);
      mockClientRepository.createQueryBuilder.mockReturnValue(qb);

      // ACT
      const result = await service.findByID(1, employee);

      // ASSERT
      expect(result).toEqual(client);
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'client.contacts',
        'contacts',
      );
      expect(
        mockClientAccessService.assertCanAccessClient,
      ).toHaveBeenCalledWith(employee, client);
    });

    it('should reject a client without access', async () => {
      mockClientRepository.createQueryBuilder.mockReturnValue(
        buildDetailQueryBuilder(client),
      );
      mockClientAccessService.assertCanAccessClient.mockRejectedValueOnce(
        new ClientAccessDeniedException(1),
      );

      await expect(service.findByID(1, employee)).rejects.toThrow(
        ClientAccessDeniedException,
      );
    });

    it('should throw ApiException when client not found', async () => {
      mockClientRepository.createQueryBuilder.mockReturnValue(
        buildDetailQueryBuilder(null),
      );

      await expect(service.findByID(999, employee)).rejects.toThrow(
        ApiException,
      );
    });
  });
});
