import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserDepartment } from './entities/user-department.entity';
import { DepartmentsService } from 'src/departments/departments.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from './interfaces';

describe('UsersService', () => {
  let service: UsersService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockUserRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockUserDeptRepository = {
    create: jest.fn(),
  };

  const mockDepartmentsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserDepartment),
          useValue: mockUserDeptRepository,
        },
        {
          provide: DepartmentsService,
          useValue: mockDepartmentsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validCreateUserDto: CreateUserDto = {
      codUser: '12345',
      email: 'juan.perez@empresa.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      password: 'password123',
      role: Role.USER,
      country: 'PE',
      phone: '+51987654321',
      departmentIds: [1, 2],
    };

    it('should create a user successfully with valid data', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockDepartmentsService.findOne.mockResolvedValue({
        id: 1,
        name: 'Ventas',
      });
      mockUserDeptRepository.create.mockReturnValue({ department: { id: 1 } });
      mockUserRepository.create.mockReturnValue({
        ...validCreateUserDto,
        id: 'uuid-123',
      });
      mockUserRepository.save.mockResolvedValue({
        ...validCreateUserDto,
        id: 'uuid-123',
      });

      // ACT
      const result = await service.create(validCreateUserDto);

      // ASSERT
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        codUser: validCreateUserDto.codUser,
      });
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        email: validCreateUserDto.email,
      });
      expect(mockDepartmentsService.findOne).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: `User created successfully with codUser: ${validCreateUserDto.codUser}`,
      });
    });

    it('should hash the password before saving', async () => {
      // ARRANGE
      const userDto = { ...validCreateUserDto };
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockDepartmentsService.findOne.mockResolvedValue({ id: 1 });
      mockUserDeptRepository.create.mockReturnValue({ department: { id: 1 } });

      let capturedUser: any;
      mockUserRepository.create.mockImplementation((user: any) => {
        capturedUser = user;
        return user;
      });
      mockUserRepository.save.mockResolvedValue({});

      // ACT
      await service.create(userDto);

      // ASSERT
      expect(capturedUser?.password).not.toBe('password123');
      expect(capturedUser?.password).toMatch(/^\$2[aby]\$/);
    });

    it('should throw ApiException if codUser already exists', async () => {
      // ARRANGE
      const userDto = { ...validCreateUserDto };
      mockUserRepository.findOneBy.mockResolvedValueOnce({
        codUser: '12345',
      });

      // ACT & ASSERT
      await expect(service.create(userDto)).rejects.toMatchObject({
        code: 400,
        message: 'User code already exists',
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException if email already exists', async () => {
      // ARRANGE
      const userDto = { ...validCreateUserDto };
      mockUserRepository.findOneBy
        .mockResolvedValueOnce(null) // codUser check passes
        .mockResolvedValueOnce({ email: 'juan.perez@empresa.com' }); // email check fails

      // ACT & ASSERT
      await expect(service.create(userDto)).rejects.toMatchObject({
        code: 400,
        message: 'User email already exists',
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException if department does not exist', async () => {
      // ARRANGE
      const userDto = { ...validCreateUserDto };
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockDepartmentsService.findOne.mockRejectedValue(
        new Error('Department not found'),
      );

      // ACT & ASSERT
      await expect(service.create(userDto)).rejects.toThrow();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException with code 500 on database error', async () => {
      // ARRANGE
      const userDto = { ...validCreateUserDto };
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockDepartmentsService.findOne.mockResolvedValue({ id: 1 });
      mockUserDeptRepository.create.mockReturnValue({});
      mockUserRepository.create.mockReturnValue({});
      mockUserRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // ACT & ASSERT
      await expect(service.create(userDto)).rejects.toMatchObject({
        code: 500,
        message: 'Error al crear usuario con departamentos',
      });
    });

    it('should validate codUser before email', async () => {
      // ARRANGE
      const userDto = { ...validCreateUserDto };
      mockUserRepository.findOneBy.mockResolvedValueOnce({
        codUser: '12345',
      });

      // ACT & ASSERT
      await expect(service.create(userDto)).rejects.toMatchObject({
        message: 'User code already exists',
      });
      expect(mockUserRepository.findOneBy).toHaveBeenCalledTimes(1);
    });

    it('should create user with multiple departments', async () => {
      // ARRANGE
      const userDto = { ...validCreateUserDto, departmentIds: [1, 2, 3] };
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockDepartmentsService.findOne.mockResolvedValue({ id: 1 });
      mockUserDeptRepository.create.mockReturnValue({ department: { id: 1 } });
      mockUserRepository.create.mockReturnValue({});
      mockUserRepository.save.mockResolvedValue({});

      // ACT
      await service.create(userDto);

      // ASSERT
      expect(mockDepartmentsService.findOne).toHaveBeenCalledTimes(3);
      expect(mockUserDeptRepository.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    const mockUser: Partial<User> = {
      codUser: '001',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@test.com',
      isActive: true,
      role: Role.USER,
      country: 'PE',
      phone: '+51987654321',
      userDepartments: [
        {
          id: 1,
          assignedAt: new Date('2024-01-01'),
          department: { id: 1, name: 'Ventas', isActive: true },
        } as UserDepartment,
      ],
    };

    it('should return user detail by codUser', async () => {
      // ARRANGE
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // ACT
      const result = await service.findOne('001');

      // ASSERT
      expect(result).toHaveProperty('codUser', '001');
      expect(result).toHaveProperty('firstName', 'Juan');
      expect(result).toHaveProperty('userDepartments');
      expect(result.userDepartments).toHaveLength(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { codUser: '001' },
        relations: ['userDepartments', 'userDepartments.department'],
      });
    });

    it('should return user with complete department information', async () => {
      // ARRANGE
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // ACT
      const result = await service.findOne('001');

      // ASSERT
      expect(result.userDepartments[0]).toHaveProperty('department');
      expect(result.userDepartments[0].department).toHaveProperty('id', 1);
      expect(result.userDepartments[0].department).toHaveProperty(
        'name',
        'Ventas',
      );
      expect(result.userDepartments[0].department).toHaveProperty(
        'isActive',
        true,
      );
    });

    it('should throw ApiException with code 404 when user not found', async () => {
      // ARRANGE
      mockUserRepository.findOne.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOne('999')).rejects.toMatchObject({
        code: 404,
        message: 'CodUser not found',
      });
    });
  });

  describe('remove', () => {
    const mockUser: Partial<User> = {
      codUser: '001',
      email: 'juan@test.com',
      isActive: true,
    };

    it('should deactivate user successfully', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // ACT
      const result = await service.remove('001');

      // ASSERT
      expect(result).toEqual({
        message: 'User #001 deactivated successfully',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        isActive: false,
      });
    });

    it('should set isActive to false', async () => {
      // ARRANGE
      const mutableUser = {
        codUser: '001',
        email: 'juan@test.com',
        isActive: true,
      };
      mockUserRepository.findOneBy.mockResolvedValue(mutableUser);

      let savedUser: any;
      mockUserRepository.save.mockImplementation((user) => {
        savedUser = user;
        return Promise.resolve(user);
      });

      // ACT
      await service.remove('001');

      // ASSERT
      expect(savedUser.isActive).toBe(false);
    });

    it('should throw ApiException if user not found', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.remove('999')).rejects.toMatchObject({
        code: 400,
        message: 'CodUser not found or already inactive',
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException if user already inactive', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // ACT & ASSERT
      await expect(service.remove('001')).rejects.toMatchObject({
        code: 400,
        message: 'CodUser not found or already inactive',
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException with code 500 on database error', async () => {
      // ARRANGE
      const validUser = {
        codUser: '001',
        email: 'juan@test.com',
        isActive: true,
      };
      mockUserRepository.findOneBy.mockResolvedValue(validUser);
      mockUserRepository.save.mockRejectedValue(new Error('Database error'));

      // ACT & ASSERT
      await expect(service.remove('001')).rejects.toMatchObject({
        code: 500,
        message: 'Error al desactivar usuario',
      });
    });

    it('should not permanently delete user (soft delete)', async () => {
      // ARRANGE
      const validUser = {
        codUser: '001',
        email: 'juan@test.com',
        isActive: true,
      };
      mockUserRepository.findOneBy.mockResolvedValue(validUser);
      mockUserRepository.save.mockResolvedValue({
        ...validUser,
        isActive: false,
      });

      // ACT
      await service.remove('001');

      // ASSERT
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.findOneBy).toHaveBeenCalled();
    });
  });

  describe('validateCodUser', () => {
    it('should not throw error if codUser does not exist', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.validateCodUser('NEW001')).resolves.not.toThrow();
    });

    it('should throw ApiException if codUser exists', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue({ codUser: 'EXISTING' });

      // ACT & ASSERT
      await expect(service.validateCodUser('EXISTING')).rejects.toMatchObject({
        code: 400,
        message: 'User code already exists',
      });
    });
  });

  describe('validateEmail', () => {
    it('should not throw error if email does not exist', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.validateEmail('new@test.com'),
      ).resolves.not.toThrow();
    });

    it('should throw ApiException if email exists', async () => {
      // ARRANGE
      mockUserRepository.findOneBy.mockResolvedValue({
        email: 'existing@test.com',
      });

      // ACT & ASSERT
      await expect(
        service.validateEmail('existing@test.com'),
      ).rejects.toMatchObject({
        code: 400,
        message: 'User email already exists',
      });
    });
  });

  describe('validateDepartmentIds', () => {
    it('should validate all department IDs successfully', async () => {
      // ARRANGE
      mockDepartmentsService.findOne.mockResolvedValue({ id: 1, name: 'Test' });

      // ACT & ASSERT
      await expect(
        service.validateDepartmentIds([1, 2, 3]),
      ).resolves.not.toThrow();
      expect(mockDepartmentsService.findOne).toHaveBeenCalledTimes(3);
    });

    it('should throw error if any department does not exist', async () => {
      // ARRANGE
      mockDepartmentsService.findOne
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce(new Error('Department not found'));

      // ACT & ASSERT
      await expect(service.validateDepartmentIds([1, 2])).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    const mockUsers: Partial<User>[] = [
      {
        codUser: '001',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@test.com',
        isActive: true,
        role: Role.USER,
        country: 'PE',
        phone: '+51987654321',
        userDepartments: [
          {
            id: 1,
            assignedAt: new Date('2024-01-01'),
            department: { id: 1, name: 'Ventas', isActive: true },
          } as UserDepartment,
        ],
      },
      {
        codUser: '002',
        firstName: 'María',
        lastName: 'García',
        email: 'maria@test.com',
        isActive: true,
        role: Role.ADMIN,
        country: 'PE',
        phone: '+51987654322',
        userDepartments: [
          {
            id: 2,
            assignedAt: new Date('2024-01-01'),
            department: { id: 2, name: 'Administración', isActive: true },
          } as UserDepartment,
        ],
      },
    ];

    it('should return users with pagination data successfully', async () => {
      // ARRANGE
      const queryDto = { limit: 10, offset: 0 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 25]);

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(result).toEqual({
        data: {
          items: expect.any(Array),
          total: 25,
          limit: 10,
          offset: 0,
        },
      });
      expect(result.data.items).toHaveLength(2);
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith(
        'user',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'user.userDepartments',
        'userDept',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'userDept.department',
        'dept',
      );
    });

    it('should apply name filter when provided', async () => {
      // ARRANGE
      const queryDto = { limit: 10, offset: 0, name: 'Juan' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        mockUsers.slice(0, 1),
        1,
      ]);

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.firstName ILike :name',
        { name: '%Juan%' },
      );
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('should apply codUser filter when provided', async () => {
      // ARRANGE
      const queryDto = { limit: 10, offset: 0, codUser: '001' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        mockUsers.slice(0, 1),
        1,
      ]);

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.codUser = :codUser',
        { codUser: '001' },
      );
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('should apply both name and codUser filters when provided', async () => {
      // ARRANGE
      const queryDto = { limit: 5, offset: 10, name: 'Juan', codUser: '001' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        mockUsers.slice(0, 1),
        1,
      ]);

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.firstName ILike :name',
        { name: '%Juan%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.codUser = :codUser',
        { codUser: '001' },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should use default limit and offset when not provided', async () => {
      // ARRANGE
      const queryDto = {};
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(0);
    });

    it('should return empty array when no users found', async () => {
      // ARRANGE
      const queryDto = { limit: 10, offset: 0 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(0);
    });

    it('should return mapped user list response objects', async () => {
      // ARRANGE
      const queryDto = { limit: 10, offset: 0 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 2]);

      // ACT
      const result = await service.findAll(queryDto);

      // ASSERT
      expect(result.data.items[0]).toMatchObject({
        codUser: '001',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@test.com',
        role: Role.USER,
        isActive: true,
        departments: ['Ventas'],
      });
      expect(result.data.items[1]).toMatchObject({
        codUser: '002',
        firstName: 'María',
        lastName: 'García',
        email: 'maria@test.com',
        role: Role.ADMIN,
        isActive: true,
        departments: ['Administración'],
      });
    });
  });
});
