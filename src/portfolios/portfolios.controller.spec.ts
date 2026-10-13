import { Test, TestingModule } from '@nestjs/testing';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';
import { User } from 'src/users/entities';

describe('PortfoliosController', () => {
  let controller: PortfoliosController;

  const mockPortfoliosService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
  const currentUser = { id: '5' } as unknown as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfoliosController],
      providers: [
        { provide: PortfoliosService, useValue: mockPortfoliosService },
      ],
    }).compile();

    controller = module.get<PortfoliosController>(PortfoliosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass the user when listing portfolios', async () => {
    const query = { limit: 10, offset: 0 };

    await controller.findAll(query, currentUser);

    expect(mockPortfoliosService.findAll).toHaveBeenCalledWith(
      query,
      currentUser,
    );
  });

  it('should pass the user when reading a portfolio', async () => {
    await controller.findOne('10', currentUser);

    expect(mockPortfoliosService.findOne).toHaveBeenCalledWith(10, currentUser);
  });
});
