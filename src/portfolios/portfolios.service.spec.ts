import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PortfoliosService } from './portfolios.service';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioUser } from './entities/portfolio-user.entity';
import { CommonValidationService } from 'src/common/common-validation.service';
import { ClientAccessService } from 'src/common/access/client-access.service';
import { PortfolioNotAssignedException } from 'src/common/access/access.exceptions';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

const employee = { id: '5', role: Role.USER } as unknown as User;

describe('PortfoliosService', () => {
  let service: PortfoliosService;

  const mockPortfolioRepository = { findOne: jest.fn() };
  const mockClientAccessService = { assertPortfolioAssigned: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfoliosService,
        {
          provide: getRepositoryToken(Portfolio),
          useValue: mockPortfolioRepository,
        },
        { provide: getRepositoryToken(PortfolioUser), useValue: {} },
        { provide: CommonValidationService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: ClientAccessService, useValue: mockClientAccessService },
      ],
    }).compile();

    service = module.get<PortfoliosService>(PortfoliosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return an assigned portfolio with its members', async () => {
      // ARRANGE
      const portfolio = { id: 10, code: 'C-10', users: [] };
      mockPortfolioRepository.findOne.mockResolvedValue(portfolio);

      // ACT
      const result = await service.findOne(10, employee);

      // ASSERT
      expect(result).toEqual(portfolio);
      expect(
        mockClientAccessService.assertPortfolioAssigned,
      ).toHaveBeenCalledWith(employee, 10);
    });

    it('should reject a portfolio not assigned to the user before querying it', async () => {
      // ARRANGE
      mockClientAccessService.assertPortfolioAssigned.mockRejectedValueOnce(
        new PortfolioNotAssignedException(99),
      );

      // ACT & ASSERT
      await expect(service.findOne(99, employee)).rejects.toThrow(
        PortfolioNotAssignedException,
      );
      expect(mockPortfolioRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the portfolio does not exist', async () => {
      mockPortfolioRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(10, employee)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
