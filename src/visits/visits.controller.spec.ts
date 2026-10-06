import { Test, TestingModule } from '@nestjs/testing';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

describe('VisitsController', () => {
  let controller: VisitsController;

  const currentUser = { id: '5', role: Role.USER } as unknown as User;

  const mockVisitsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitsController],
      providers: [{ provide: VisitsService, useValue: mockVisitsService }],
    }).compile();

    controller = module.get<VisitsController>(VisitsController);
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
    const dto = { visitTopics: 'cambio' };

    await controller.findAll(query, currentUser);
    await controller.findOne(10, currentUser);
    await controller.update(10, dto, currentUser);
    await controller.remove(10, currentUser);

    expect(mockVisitsService.findAll).toHaveBeenCalledWith(query, currentUser);
    expect(mockVisitsService.findOne).toHaveBeenCalledWith(10, currentUser);
    expect(mockVisitsService.update).toHaveBeenCalledWith(10, dto, currentUser);
    expect(mockVisitsService.remove).toHaveBeenCalledWith(10, currentUser);
  });
});
