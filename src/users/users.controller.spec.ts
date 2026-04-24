import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Role } from './interfaces';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      // ARRANGE
      const createUserDto: CreateUserDto = {
        codUser: '001',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        role: Role.USER,
        country: 'PE',
        phone: '+51987654321',
        departmentIds: [1, 2],
      };
      const expectedResult = {
        message: 'User created successfully with codUser: 001',
      };
      mockUsersService.create.mockResolvedValue(expectedResult);

      // ACT
      const result = await controller.create(createUserDto);

      // ASSERT
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return users with pagination data', async () => {
      // ARRANGE
      const queryDto: QueryUserDto = { limit: 10, offset: 0 };
      const expectedResult = {
        data: {
          data: [
            {
              codUser: '001',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@test.com',
              role: Role.USER,
              isActive: true,
              departments: ['Ventas'],
            },
            {
              codUser: '002',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@test.com',
              role: Role.ADMIN,
              isActive: true,
              departments: ['Administración'],
            },
          ],
          total: 25,
          limit: 10,
          offset: 0,
        },
      };
      mockUsersService.findAll.mockResolvedValue(expectedResult);

      // ACT
      const result = await controller.findAll(queryDto);

      // ASSERT
      expect(mockUsersService.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResult);
      expect(result.data.data).toHaveLength(2);
      expect(result.data.total).toBe(25);
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(0);
    });

    it('should handle empty query parameters', async () => {
      // ARRANGE
      const queryDto: QueryUserDto = {};
      const expectedResult = {
        data: {
          data: [],
          total: 0,
          limit: 10,
          offset: 0,
        },
      };
      mockUsersService.findAll.mockResolvedValue(expectedResult);

      // ACT
      const result = await controller.findAll(queryDto);

      // ASSERT
      expect(mockUsersService.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle query with filters', async () => {
      // ARRANGE
      const queryDto: QueryUserDto = {
        limit: 5,
        offset: 10,
        name: 'John',
        codUser: '001',
      };
      const expectedResult = {
        data: {
          data: [
            {
              codUser: '001',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@test.com',
              role: Role.USER,
              isActive: true,
              departments: ['Ventas'],
            },
          ],
          total: 1,
          limit: 5,
          offset: 10,
        },
      };
      mockUsersService.findAll.mockResolvedValue(expectedResult);

      // ACT
      const result = await controller.findAll(queryDto);

      // ASSERT
      expect(mockUsersService.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a user by codUser', async () => {
      // ARRANGE
      const codUser = '001';
      const expectedResult = {
        codUser: '001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        isActive: true,
        role: Role.USER,
        country: 'PE',
        phone: '+51987654321',
        userDepartments: [
          {
            id: '1',
            assignedAt: new Date('2024-01-01'),
            department: {
              id: 1,
              name: 'Ventas',
              isActive: true,
            },
          },
        ],
      };
      mockUsersService.findOne.mockResolvedValue(expectedResult);

      // ACT
      const result = await controller.findOne(codUser);

      // ASSERT
      expect(mockUsersService.findOne).toHaveBeenCalledWith(codUser);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should deactivate a user successfully', async () => {
      // ARRANGE
      const codUser = '001';
      const expectedResult = {
        message: 'User #001 deactivated successfully',
      };
      mockUsersService.remove.mockResolvedValue(expectedResult);

      // ACT
      const result = await controller.remove(codUser);

      // ASSERT
      expect(mockUsersService.remove).toHaveBeenCalledWith(codUser);
      expect(result).toEqual(expectedResult);
    });
  });
});
