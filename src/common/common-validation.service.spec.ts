import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommonValidationService } from './common-validation.service';
import { Client, ContactClient } from 'src/clients/entities';
import { Department } from 'src/departments/entities/department.entity';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteInvalidStatusTransitionException } from 'src/quotes/exceptions/quote.exceptions';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { User } from 'src/users/entities';

describe('CommonValidationService', () => {
  let service: CommonValidationService;

  const mockQuoteRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonValidationService,
        { provide: getRepositoryToken(Quote), useValue: mockQuoteRepository },
        { provide: getRepositoryToken(Client), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(ContactClient), useValue: {} },
        { provide: getRepositoryToken(Department), useValue: {} },
        { provide: getRepositoryToken(PurchaseOrder), useValue: {} },
      ],
    }).compile();

    service = module.get<CommonValidationService>(CommonValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateQuoteAprobed', () => {
    it('should return the quote when it is PENDIENTE', async () => {
      // ARRANGE
      const quote = { id: '20', status: QuoteStatus.PENDIENTE };
      mockQuoteRepository.findOne.mockResolvedValue(quote);

      // ACT & ASSERT
      await expect(service.validateQuoteAprobed(20)).resolves.toBe(quote);
    });

    it.each([QuoteStatus.APROBADO, QuoteStatus.RECHAZADO])(
      'should not allow a PO for a %s quote',
      async (status) => {
        mockQuoteRepository.findOne.mockResolvedValue({ id: '20', status });

        await expect(service.validateQuoteAprobed(20)).rejects.toThrow(
          QuoteInvalidStatusTransitionException,
        );
      },
    );
  });
});
