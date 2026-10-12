import { Test, TestingModule } from '@nestjs/testing';
import { DeliverysController } from './deliverys.controller';
import { DeliverysService } from './deliverys.service';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

describe('DeliverysController', () => {
  let controller: DeliverysController;

  const currentUser = { id: '5', role: Role.USER } as unknown as User;

  const mockDeliverysService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliverysController],
      providers: [
        { provide: DeliverysService, useValue: mockDeliverysService },
      ],
    }).compile();

    controller = module.get<DeliverysController>(DeliverysController);
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
    const createDto = { departmentId: 3 };
    const updateDto = { deliveryDate: '2026-10-08' };

    await controller.create(createDto, currentUser);
    await controller.findAll(query, currentUser);
    await controller.findOne('40', currentUser);
    await controller.update('40', updateDto, currentUser);
    await controller.remove('40', currentUser);

    expect(mockDeliverysService.create).toHaveBeenCalledWith(
      createDto,
      currentUser,
    );
    expect(mockDeliverysService.findAll).toHaveBeenCalledWith(
      query,
      currentUser,
    );
    expect(mockDeliverysService.findOne).toHaveBeenCalledWith(40, currentUser);
    expect(mockDeliverysService.update).toHaveBeenCalledWith(
      40,
      updateDto,
      currentUser,
    );
    expect(mockDeliverysService.remove).toHaveBeenCalledWith(40, currentUser);
  });
});
