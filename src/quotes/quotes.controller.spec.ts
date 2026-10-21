import { Test, TestingModule } from '@nestjs/testing';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

describe('QuotesController', () => {
  let controller: QuotesController;

  const currentUser = { id: '5', role: Role.USER } as unknown as User;

  const mockQuotesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [{ provide: QuotesService, useValue: mockQuotesService }],
    }).compile();

    controller = module.get<QuotesController>(QuotesController);
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
    const updateDto = { description: 'cambio' };
    const removeDto = { statusReason: 'Cliente desistió' };

    await controller.findAll(query, currentUser);
    await controller.findOne('20', currentUser);
    await controller.update('20', updateDto, currentUser);
    await controller.remove('20', removeDto, currentUser);

    expect(mockQuotesService.findAll).toHaveBeenCalledWith(query, currentUser);
    expect(mockQuotesService.findOne).toHaveBeenCalledWith(20, currentUser);
    expect(mockQuotesService.update).toHaveBeenCalledWith(
      20,
      updateDto,
      currentUser,
    );
    expect(mockQuotesService.remove).toHaveBeenCalledWith(
      20,
      removeDto,
      currentUser,
    );
  });
});
