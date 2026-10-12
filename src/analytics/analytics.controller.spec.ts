import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User } from 'src/users/entities';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const mockAnalyticsService = {
    getQuoteStats: jest.fn(),
    getVisitStats: jest.fn(),
  };
  const currentUser = { id: '5' } as unknown as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('pasa el usuario autenticado al resumen de cotizaciones', async () => {
    const query = { departmentId: 3 };
    await controller.getQuotesSummary(query, currentUser);

    expect(mockAnalyticsService.getQuoteStats).toHaveBeenCalledWith(
      query,
      currentUser,
    );
  });

  it('pasa el usuario autenticado al resumen de visitas', async () => {
    const query = { departmentId: 3 };
    await controller.getVisitsSummary(query, currentUser);

    expect(mockAnalyticsService.getVisitStats).toHaveBeenCalledWith(
      query,
      currentUser,
    );
  });
});
