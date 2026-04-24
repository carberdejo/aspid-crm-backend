import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContactClientDto } from './dto';
import { QueryClientDto } from './dto/query-client.dto';

describe('ClientsController', () => {
  let controller: ClientsController;

  // Define mocks
  const mockClientsService = {
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    findByID: jest.fn(),
    consultSunatApi: jest.fn(),
    createContact: jest.fn(),
    findClientContacts: jest.fn(),
    findOneContact: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new client', async () => {
      // ARRANGE: Setup data and mocks
      const createClientDto: CreateClientDto = {
        ruc: '20123456789',
        businessName: 'Test Company SAC',
        commercialName: 'Test Company',
        address: 'Av. Test 123',
      };

      const expectedResponse = {
        message: 'Cliente creado exitosamente',
        data: { id: 1, ...createClientDto },
      };

      mockClientsService.create.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.create(createClientDto);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.create).toHaveBeenCalledWith(createClientDto);
      expect(mockClientsService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      // ARRANGE: Setup data and mocks
      const clientId = 1;
      const updateClientDto: UpdateClientDto = {
        businessName: 'Updated Company SAC',
        address: 'Av. Updated 456',
      };

      const expectedResponse = {
        message: 'Cliente actualizado exitosamente',
        data: { id: clientId, ...updateClientDto },
      };

      mockClientsService.update.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.update(clientId, updateClientDto);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.update).toHaveBeenCalledWith(
        clientId,
        updateClientDto,
      );
      expect(mockClientsService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return paginated clients', async () => {
      // ARRANGE: Setup data and mocks
      const query: QueryClientDto = { limit: 10, offset: 0 };
      const expectedResponse = {
        message: 'Clientes obtenidos exitosamente',
        data: [
          {
            id: 1,
            ruc: '20123456789',
            businessName: 'Company 1',
            commercialName: 'Co 1',
            address: 'Address 1',
          },
          {
            id: 2,
            ruc: '20987654321',
            businessName: 'Company 2',
            commercialName: 'Co 2',
            address: 'Address 2',
          },
        ],
        total: 2,
        limit: 10,
        offset: 0,
      };

      mockClientsService.findAll.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.findAll(query);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.findAll).toHaveBeenCalledWith(query);
      expect(mockClientsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should filter clients by name', async () => {
      // ARRANGE: Setup data and mocks
      const query: QueryClientDto = {
        name: 'Test',
        limit: 10,
        offset: 0,
      };

      const expectedResponse = {
        message: 'Clientes obtenidos exitosamente',
        data: [
          {
            id: 1,
            ruc: '20123456789',
            businessName: 'Test Company SAC',
            commercialName: 'Test Co',
            address: 'Address 1',
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      };

      mockClientsService.findAll.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.findAll(query);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter clients by RUC', async () => {
      // ARRANGE: Setup data and mocks
      const query: QueryClientDto = {
        ruc: '20123456789',
        limit: 10,
        offset: 0,
      };

      const expectedResponse = {
        message: 'Clientes obtenidos exitosamente',
        data: [
          {
            id: 1,
            ruc: '20123456789',
            businessName: 'Test Company SAC',
            commercialName: 'Test Co',
            address: 'Address 1',
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      };

      mockClientsService.findAll.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.findAll(query);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('consultaSunat', () => {
    it('should return RUC information from SUNAT API', async () => {
      // ARRANGE: Setup data and mocks
      const ruc = '20123456789';
      const expectedResponse = {
        message: 'Información de RUC obtenida exitosamente',
        data: {
          ruc: '20123456789',
          razonSocial: 'Test Company SAC',
          direccion: 'Av. Test 123, Lima',
        },
      };

      mockClientsService.consultSunatApi.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.consultaSunat(ruc);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.consultSunatApi).toHaveBeenCalledWith(ruc);
      expect(mockClientsService.consultSunatApi).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a client by ID', async () => {
      // ARRANGE: Setup data and mocks
      const id = 1;
      const expectedResponse = {
        id: 1,
        ruc: '20123456789',
        businessName: 'Test Company SAC',
        commercialName: 'Test Co',
        address: 'Address 1',
        contacts: [],
      };

      mockClientsService.findByID.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.findOne(id);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.findByID).toHaveBeenCalledWith(id);
      expect(mockClientsService.findByID).toHaveBeenCalledTimes(1);
    });
  });

  describe('createContact', () => {
    it('should create a new contact for a client', async () => {
      // ARRANGE: Setup data and mocks
      const createContactDto: CreateContactClientDto = {
        clientId: 1,
        firstName: 'John',
        lastName: 'Doe',
        position: 'Manager',
        phone: '987654321',
      };

      const expectedResponse = {
        data: {
          message: 'Contacto creado exitosamente',
          item: { id: 1, ...createContactDto },
        },
      };

      mockClientsService.createContact.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.createContact(createContactDto);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.createContact).toHaveBeenCalledWith(
        createContactDto,
      );
      expect(mockClientsService.createContact).toHaveBeenCalledTimes(1);
    });
  });

  describe('findClientContacts', () => {
    it('should return all contacts for a client', async () => {
      // ARRANGE: Setup data and mocks
      const clientId = 1;
      const expectedResponse = {
        message: 'Contactos obtenidos exitosamente',
        data: [
          {
            id: 1,
            clientId: 1,
            firstName: 'John',
            lastName: 'Doe',
            position: 'Manager',
            phone: '987654321',
          },
          {
            id: 2,
            clientId: 1,
            firstName: 'Jane',
            lastName: 'Doe',
            position: 'Director',
            phone: '987654322',
          },
        ],
        total: 2,
      };

      mockClientsService.findClientContacts.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.findClientContacts(clientId);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.findClientContacts).toHaveBeenCalledWith(
        clientId,
      );
      expect(mockClientsService.findClientContacts).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOneContact', () => {
    it('should return a contact by ID', async () => {
      // ARRANGE: Setup data and mocks
      const contactId = 1;
      const expectedResponse = {
        message: 'Contacto obtenido exitosamente',
        data: {
          id: 1,
          clientId: 1,
          firstName: 'John',
          lastName: 'Doe',
          position: 'Manager',
          phone: '987654321',
        },
      };

      mockClientsService.findOneContact.mockResolvedValue(expectedResponse);

      // ACT: Execute method
      const result = await controller.findOneContact(contactId);

      // ASSERT: Verify results
      expect(result).toEqual(expectedResponse);
      expect(mockClientsService.findOneContact).toHaveBeenCalledWith(contactId);
      expect(mockClientsService.findOneContact).toHaveBeenCalledTimes(1);
    });
  });
});
