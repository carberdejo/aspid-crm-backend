import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

describe('InvoicesController', () => {
  let controller: InvoicesController;

  const currentUser = { id: '5', role: Role.USER } as unknown as User;

  const mockInvoicesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: mockInvoicesService }],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // El alcance depende del usuario autenticado: cada endpoint debe pasarlo al servicio
  it('should pass the authenticated user to every service call', async () => {
    const query = { limit: 10, offset: 0 };

    await controller.findAll(query, currentUser);
    await controller.findOne('30', currentUser);

    expect(mockInvoicesService.findAll).toHaveBeenCalledWith(
      query,
      currentUser,
    );
    expect(mockInvoicesService.findOne).toHaveBeenCalledWith(30, currentUser);
  });
});
