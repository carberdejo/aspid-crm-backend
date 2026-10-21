import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContactClientDto } from './dto';
import { QueryClientDto } from './dto/query-client.dto';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

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

  const user = { id: '5', role: Role.USER } as unknown as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: mockClientsService }],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // El alcance por cartera lo aplica el servicio: el controlador debe pasarle el usuario
  it('should pass the user when creating a client', async () => {
    // ARRANGE
    const dto = { ruc: '20123456789', portfolioId: 10 } as CreateClientDto;
    mockClientsService.create.mockResolvedValue({ data: { id: 1 } });

    // ACT
    const result = await controller.create(dto, user);

    // ASSERT
    expect(result).toEqual({ data: { id: 1 } });
    expect(mockClientsService.create).toHaveBeenCalledWith(dto, user);
  });

  it('should pass the user when listing clients', async () => {
    const query = { limit: 10, offset: 0 } as QueryClientDto;

    await controller.findAll(query, user);

    expect(mockClientsService.findAll).toHaveBeenCalledWith(query, user);
  });

  it('should pass the user when reading a client', async () => {
    await controller.findOne(1, user);

    expect(mockClientsService.findByID).toHaveBeenCalledWith(1, user);
  });

  it('should pass the user when reading the contacts of a client', async () => {
    await controller.findClientContacts(1, user);

    expect(mockClientsService.findClientContacts).toHaveBeenCalledWith(1, user);
  });

  it('should pass the user when reading a contact', async () => {
    await controller.findOneContact(3, user);

    expect(mockClientsService.findOneContact).toHaveBeenCalledWith(3, user);
  });

  it('should pass the user when creating a contact', async () => {
    const dto = { clientId: 1, firstName: 'John' } as CreateContactClientDto;

    await controller.createContact(dto, user);

    expect(mockClientsService.createContact).toHaveBeenCalledWith(dto, user);
  });

  it('should update a client (admin only, see UserRoleGuard spec)', async () => {
    const dto: UpdateClientDto = { businessName: 'Updated Company SAC' };

    await controller.update(1, dto);

    expect(mockClientsService.update).toHaveBeenCalledWith(1, dto);
  });

  it('should query SUNAT by RUC', async () => {
    await controller.consultaSunat('20123456789');

    expect(mockClientsService.consultSunatApi).toHaveBeenCalledWith(
      '20123456789',
    );
  });
});
