import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { Client, ContactClient } from './entities';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContactClientDto } from './dto';
import { ApiException } from 'src/common/exceptions/api.exception';

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

  const mockConfigService = {
    get: jest.fn(),
  };

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
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a client successfully', async () => {
      // ARRANGE: Setup data and mocks
      const createClientDto: CreateClientDto = {
        ruc: '20123456789',
        businessName: 'Test Company SAC',
        commercialName: 'Test Company',
        address: 'Av. Test 123',
      };

      const savedClient = {
        id: 1,
        ...createClientDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClientRepository.findOneBy.mockResolvedValue(null);
      mockClientRepository.create.mockReturnValue(createClientDto);
      mockClientRepository.save.mockResolvedValue(savedClient);

      // ACT: Execute method
      const result = await service.create(createClientDto);

      // ASSERT: Verify results
      expect(result.data.message).toContain('exitosamente');
      expect(result.data.item).toEqual(savedClient);
      expect(mockClientRepository.findOneBy).toHaveBeenCalledWith({
        ruc: createClientDto.ruc,
      });
      expect(mockClientRepository.create).toHaveBeenCalledWith(createClientDto);
      expect(mockClientRepository.save).toHaveBeenCalled();
    });

    it('should throw ApiException when RUC already exists', async () => {
      // ARRANGE: Setup data and mocks
      const createClientDto: CreateClientDto = {
        ruc: '20123456789',
        businessName: 'Test Company SAC',
        commercialName: 'Test Company',
        address: 'Av. Test 123',
      };

      const existingClient = { id: 1, ruc: createClientDto.ruc };
      mockClientRepository.findOneBy.mockResolvedValue(existingClient);

      // ACT & ASSERT: Execute and verify error
      await expect(service.create(createClientDto)).rejects.toThrow(
        ApiException,
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // ARRANGE: Setup data and mocks
      const createClientDto: CreateClientDto = {
        ruc: '20123456789',
        businessName: 'Test Company SAC',
        commercialName: 'Test Company',
        address: 'Av. Test 123',
      };

      mockClientRepository.findOneBy.mockResolvedValue(null);
      mockClientRepository.create.mockReturnValue(createClientDto);
      mockClientRepository.save.mockRejectedValue(new Error('Database error'));

      // ACT & ASSERT: Execute and verify error
      await expect(service.create(createClientDto)).rejects.toThrow(
        ApiException,
      );
    });
  });

  describe('update', () => {
    it('should update a client successfully', async () => {
      // ARRANGE: Setup data and mocks
      const clientId = 1;
      const updateClientDto: UpdateClientDto = {
        businessName: 'Updated Company SAC',
        address: 'Av. Updated 456',
      };

      const existingClient = {
        id: clientId,
        ruc: '20123456789',
        businessName: 'Old Company SAC',
        commercialName: 'Old Company',
        address: 'Av. Old 123',
      };

      const updatedClient = {
        ...existingClient,
        ...updateClientDto,
      };

      mockClientRepository.findOneBy.mockResolvedValueOnce(existingClient);
      mockClientRepository.save.mockResolvedValue(updatedClient);

      // ACT: Execute method
      const result = await service.update(clientId, updateClientDto);

      // ASSERT: Verify results
      expect(result.message).toContain('actualizado exitosamente');
      expect(result.data).toEqual(updatedClient);
      expect(mockClientRepository.findOneBy).toHaveBeenCalledWith({
        id: clientId,
      });
      expect(mockClientRepository.save).toHaveBeenCalled();
    });

    it('should throw ApiException when client not found', async () => {
      // ARRANGE: Setup data and mocks
      const clientId = 999;
      const updateClientDto: UpdateClientDto = {
        businessName: 'Updated Company SAC',
      };

      mockClientRepository.findOneBy.mockResolvedValue(null);

      // ACT & ASSERT: Execute and verify error
      await expect(service.update(clientId, updateClientDto)).rejects.toThrow(
        ApiException,
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException when updating to duplicate RUC', async () => {
      // ARRANGE: Setup data and mocks
      const clientId = 1;
      const updateClientDto: UpdateClientDto = {
        ruc: '20999888777',
      };

      const existingClient = {
        id: clientId,
        ruc: '20123456789',
        businessName: 'Test Company SAC',
      };

      const duplicateClient = {
        id: 2,
        ruc: '20999888777',
        businessName: 'Another Company SAC',
      };

      mockClientRepository.findOneBy
        .mockResolvedValueOnce(existingClient)
        .mockResolvedValueOnce(duplicateClient);

      // ACT & ASSERT: Execute and verify error
      await expect(service.update(clientId, updateClientDto)).rejects.toThrow(
        ApiException,
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated clients', async () => {
      // ARRANGE: Setup data and mocks
      const query = { limit: 10, offset: 0 };
      const clients = [
        { id: 1, ruc: '20123456789', businessName: 'Company 1' },
        { id: 2, ruc: '20987654321', businessName: 'Company 2' },
      ];
      const total = 2;

      const mockQueryBuilder = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([clients, total]),
      };

      mockClientRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // ACT: Execute method
      const result = await service.findAll(query);

      // ASSERT: Verify results
      expect(result.data.items).toEqual(clients);
      expect(result.data.total).toBe(total);
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(0);
      expect(mockClientRepository.createQueryBuilder).toHaveBeenCalledWith(
        'client',
      );
    });

    it('should filter by name', async () => {
      // ARRANGE: Setup data and mocks
      const query = { name: 'Test', limit: 10, offset: 0 };
      const clients = [
        { id: 1, ruc: '20123456789', businessName: 'Test Company' },
      ];

      const mockQueryBuilder = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([clients, 1]),
      };

      mockClientRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // ACT: Execute method
      const result = await service.findAll(query);

      // ASSERT: Verify results
      expect(result.data.items).toEqual(clients);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter by RUC', async () => {
      // ARRANGE: Setup data and mocks
      const query = { ruc: '20123456789', limit: 10, offset: 0 };
      const clients = [
        { id: 1, ruc: '20123456789', businessName: 'Test Company' },
      ];

      const mockQueryBuilder = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([clients, 1]),
      };

      mockClientRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // ACT: Execute method
      const result = await service.findAll(query);

      // ASSERT: Verify results
      expect(result.data.items).toEqual(clients);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.ruc = :ruc',
        { ruc: query.ruc },
      );
    });
  });

  describe('createContact', () => {
    it('should create a contact successfully', async () => {
      // ARRANGE: Setup data and mocks
      const contactData: CreateContactClientDto = {
        clientId: 1,
        firstName: 'John',
        lastName: 'Doe',
        position: 'Manager',
        phone: '987654321',
      };

      const client = { id: 1, ruc: '20123456789', businessName: 'Test Co' };
      const savedContact = {
        id: 1,
        ...contactData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClientRepository.findOneBy.mockResolvedValue(client);
      mockContactClientRepository.create.mockReturnValue(contactData);
      mockContactClientRepository.save.mockResolvedValue(savedContact);

      // ACT: Execute method
      const result = await service.createContact(contactData);

      // ASSERT: Verify results
      expect(result.data.message).toContain('exitosamente');
      expect(result.data.item).toEqual(savedContact);
      expect(mockClientRepository.findOneBy).toHaveBeenCalledWith({
        id: contactData.clientId,
      });
      expect(mockContactClientRepository.create).toHaveBeenCalledWith(
        contactData,
      );
      expect(mockContactClientRepository.save).toHaveBeenCalled();
    });

    it('should throw ApiException when client not found', async () => {
      // ARRANGE: Setup data and mocks
      const contactData: CreateContactClientDto = {
        clientId: 999,
        firstName: 'John',
        lastName: 'Doe',
        position: 'Manager',
        phone: '987654321',
      };

      mockClientRepository.findOneBy.mockResolvedValue(null);

      // ACT & ASSERT: Execute and verify error
      await expect(service.createContact(contactData)).rejects.toThrow(
        ApiException,
      );
      expect(mockContactClientRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findClientContacts', () => {
    it('should return all contacts for a client', async () => {
      // ARRANGE: Setup data and mocks
      const clientId = 1;
      const contacts = [
        {
          id: 1,
          clientId,
          firstName: 'John',
          lastName: 'Doe',
          position: 'Manager',
          phone: '987654321',
        },
        {
          id: 2,
          clientId,
          firstName: 'Jane',
          lastName: 'Doe',
          position: 'Director',
          phone: '987654322',
        },
      ];

      const client = { id: clientId, ruc: '20123456789' };
      mockClientRepository.findOneBy.mockResolvedValue(client);
      mockContactClientRepository.find.mockResolvedValue(contacts);

      // ACT: Execute method
      const result = await service.findClientContacts(clientId);

      // ASSERT: Verify results
      expect(result.message).toContain('exitosamente');
      expect(result.data).toEqual(contacts);
      expect(result.total).toBe(contacts.length);
      expect(mockClientRepository.findOneBy).toHaveBeenCalledWith({
        id: clientId,
      });
      expect(mockContactClientRepository.find).toHaveBeenCalledWith({
        where: { clientId },
      });
    });

    it('should throw ApiException when client not found', async () => {
      // ARRANGE: Setup data and mocks
      const clientId = 999;
      mockClientRepository.findOneBy.mockResolvedValue(null);

      // ACT & ASSERT: Execute and verify error
      await expect(service.findClientContacts(clientId)).rejects.toThrow(
        ApiException,
      );
      expect(mockContactClientRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findOneContact', () => {
    it('should return a contact by ID', async () => {
      // ARRANGE: Setup data and mocks
      const contactId = 1;
      const contact = {
        id: contactId,
        clientId: 1,
        firstName: 'John',
        lastName: 'Doe',
        position: 'Manager',
        phone: '987654321',
      };

      mockContactClientRepository.findOne.mockResolvedValue(contact);

      // ACT: Execute method
      const result = await service.findOneContact(contactId);

      // ASSERT: Verify results
      expect(result.message).toContain('exitosamente');
      expect(result.data).toEqual(contact);
      expect(mockContactClientRepository.findOne).toHaveBeenCalledWith({
        where: { id: contactId },
        relations: ['client'],
      });
    });

    it('should throw ApiException when contact not found', async () => {
      // ARRANGE: Setup data and mocks
      const contactId = 999;
      mockContactClientRepository.findOne.mockResolvedValue(null);

      // ACT & ASSERT: Execute and verify error
      await expect(service.findOneContact(contactId)).rejects.toThrow(
        ApiException,
      );
    });
  });

  describe('findByID', () => {
    it('should return a client by ID with contacts', async () => {
      // ARRANGE: Setup data and mocks
      const id = 1;
      const client = {
        id,
        ruc: '20123456789',
        businessName: 'Test Company SAC',
        contacts: [
          {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            position: 'Manager',
            phone: '987654321',
          },
        ],
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(client),
      };

      mockClientRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // ACT: Execute method
      const result = await service.findByID(id);

      // ASSERT: Verify results
      expect(result).toEqual(client);
      expect(mockClientRepository.createQueryBuilder).toHaveBeenCalledWith(
        'client',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'client.contacts',
        'contacts',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('client.id = :id', {
        id,
      });
    });

    it('should throw ApiException when client not found', async () => {
      // ARRANGE: Setup data and mocks
      const id = 999;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockClientRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // ACT & ASSERT: Execute and verify error
      await expect(service.findByID(id)).rejects.toThrow(ApiException);
    });
  });
});
