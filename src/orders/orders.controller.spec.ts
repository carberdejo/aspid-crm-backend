import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

describe('OrdersController', () => {
  let controller: OrdersController;

  const currentUser = { id: '5', role: Role.USER } as unknown as User;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
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

    expect(mockOrdersService.findAll).toHaveBeenCalledWith(query, currentUser);
    expect(mockOrdersService.findOne).toHaveBeenCalledWith(30, currentUser);
  });
});
