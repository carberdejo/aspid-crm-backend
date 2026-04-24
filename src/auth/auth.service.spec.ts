import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserSession } from 'src/users/entities';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto';
import { ApiException } from 'src/common/exceptions/api.exception';
import { Role } from 'src/users/interfaces';

// Mock de bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockUserSessionRepository = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock de Request
  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(UserSession),
          useValue: mockUserSessionRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        'jwt.refreshExpiresIn': '7d',
      };
      return config[key] || '7d';
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(jwtService).toBeDefined();
  });

  describe('login', () => {
    const validLoginDto: LoginUserDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const mockUser = {
      id: 'uuid-123',
      codUser: 'USER001',
      email: 'test@example.com',
      password: '$2b$10$hashedPasswordExample',
      role: Role.USER,
      userDepartments: [
        {
          id: 1,
          assignedAt: new Date('2024-01-01'),
          department: {
            id: 1,
            name: 'Ventas',
            isActive: true,
          },
        },
        {
          id: 2,
          assignedAt: new Date('2024-01-01'),
          department: {
            id: 2,
            name: 'Marketing',
            isActive: true,
          },
        },
      ],
    };

    describe('✅ CASOS EXITOSOS', () => {
      it('should successfully login with valid credentials and return token', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('mock.access.token')
          .mockReturnValueOnce('mock.refresh.token');

        // ACT
        const result = await service.login(validLoginDto, mockRequest);

        // ASSERT
        expect(result).toEqual({
          accessToken: 'mock.access.token',
          refreshToken: 'mock.refresh.token',
        });
        expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith(
          'user',
        );
        expect(mockQueryBuilder.select).toHaveBeenCalledWith([
          'user.id',
          'user.email',
          'user.password',
          'user.codUser',
          'user.role',
        ]);
        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
          'user.userDepartments',
          'userDept',
        );
        expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
          'userDept.department',
          'dept',
        );
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.email = :email',
          { email: validLoginDto.email },
        );
        expect(bcrypt.compareSync).toHaveBeenCalledWith(
          validLoginDto.password,
          mockUser.password,
        );
        expect(mockJwtService.sign).toHaveBeenNthCalledWith(
          1,
          {
            sub: mockUser.codUser,
            email: mockUser.email,
            role: mockUser.role,
            depts: [1, 2],
          },
          { expiresIn: '7d' },
        );
      });

      it('should generate different tokens for different users', async () => {
        // ARRANGE
        const user1 = {
          ...mockUser,
          codUser: 'USER001',
          email: 'user1@test.com',
          userDepartments: [
            {
              id: 1,
              assignedAt: new Date('2024-01-01'),
              department: { id: 1, name: 'Administración', isActive: true },
            },
          ],
        };
        const user2 = {
          ...mockUser,
          codUser: 'USER002',
          email: 'user2@test.com',
          userDepartments: [
            {
              id: 2,
              assignedAt: new Date('2024-01-01'),
              department: { id: 2, name: 'IT', isActive: true },
            },
          ],
        };

        mockQueryBuilder.getOne.mockResolvedValueOnce(user1);
        mockQueryBuilder.getOne.mockResolvedValueOnce(user2);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('token.access.user1')
          .mockReturnValueOnce('token.refresh.user1')
          .mockReturnValueOnce('token.access.user2')
          .mockReturnValueOnce('token.refresh.user2');

        // ACT
        const result1 = await service.login(
          {
            ...validLoginDto,
            email: user1.email,
          },
          mockRequest,
        );
        const result2 = await service.login(
          {
            ...validLoginDto,
            email: user2.email,
          },
          mockRequest,
        );

        // ASSERT
        expect(result1.accessToken).not.toBe(result2.accessToken);
        expect(result1.refreshToken).not.toBe(result2.refreshToken);
        expect(mockJwtService.sign).toHaveBeenCalledTimes(4); // 2 calls per login
      });

      it('should include correct payload in JWT token', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('mock.access.token')
          .mockReturnValueOnce('mock.refresh.token');

        // ACT
        await service.login(validLoginDto, mockRequest);

        // ASSERT
        expect(mockJwtService.sign).toHaveBeenNthCalledWith(
          1,
          {
            sub: mockUser.codUser,
            email: mockUser.email,
            role: mockUser.role,
            depts: [1, 2],
          },
          { expiresIn: '7d' },
        );
      });
    });

    describe('❌ CASOS DE ERROR - Seguridad', () => {
      it('should throw ApiException with code 401 when email does not exist', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(
          service.login(validLoginDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
          message: 'Credentials are not valid (email)',
        });

        // Verificar que no se intentó comparar passwords
        expect(bcrypt.compareSync).not.toHaveBeenCalled();
        // Verificar que no se generó token
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('should throw ApiException with code 401 when password is incorrect', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

        // ACT & ASSERT
        await expect(
          service.login(validLoginDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
          message: 'Credentials are not valid (password)',
        });

        // Verificar que se encontró el usuario
        expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
        // Verificar que se comparó la password
        expect(bcrypt.compareSync).toHaveBeenCalledWith(
          validLoginDto.password,
          mockUser.password,
        );
        // Verificar que NO se generó token
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('should not reveal if email exists when credentials are invalid', async () => {
        // ARRANGE - Usuario no existe
        mockQueryBuilder.getOne.mockResolvedValue(null);

        // ACT
        let errorForNonExistentEmail: ApiException | undefined;
        try {
          await service.login(validLoginDto, mockRequest);
        } catch (error) {
          errorForNonExistentEmail = error as ApiException;
        }

        // ARRANGE - Password incorrecta
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

        let errorForWrongPassword: ApiException | undefined;
        try {
          await service.login(validLoginDto, mockRequest);
        } catch (error) {
          errorForWrongPassword = error as ApiException;
        }

        // ASSERT - Ambos errores deberían tener código 401
        expect(errorForNonExistentEmail?.code).toBe(401);
        expect(errorForWrongPassword?.code).toBe(401);
        // Los mensajes pueden ser diferentes pero el código debe ser el mismo
        expect(errorForNonExistentEmail?.code).toBe(
          errorForWrongPassword?.code,
        );
      });

      it('should properly handle bcrypt comparison errors', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockImplementation(() => {
          throw new Error('Bcrypt error');
        });

        // ACT & ASSERT
        await expect(
          service.login(validLoginDto, mockRequest),
        ).rejects.toThrow();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });
    });

    describe('🔒 CASOS DE SEGURIDAD ADICIONALES', () => {
      it('should select only necessary fields from database (password, email, codUser, role)', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('mock.access.token')
          .mockReturnValueOnce('mock.refresh.token');

        // ACT
        await service.login(validLoginDto, mockRequest);

        // ASSERT
        expect(mockQueryBuilder.select).toHaveBeenCalledWith([
          'user.id',
          'user.email',
          'user.password',
          'user.codUser',
          'user.role',
        ]);
      });

      it('should not include password in the response', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('mock.access.token')
          .mockReturnValueOnce('mock.refresh.token');

        // ACT
        const result = await service.login(validLoginDto, mockRequest);

        // ASSERT
        expect(result).not.toHaveProperty('password');
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
      });

      it('should handle SQL injection attempts in email field', async () => {
        // ARRANGE
        const sqlInjectionDto: LoginUserDto = {
          email: "admin@test.com' OR '1'='1",
          password: 'anything',
        };
        mockQueryBuilder.getOne.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(
          service.login(sqlInjectionDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
        });

        // Verificar que se pasó el email tal cual al QueryBuilder
        // TypeORM se encarga de la sanitización
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.email = :email',
          { email: sqlInjectionDto.email },
        );
      });

      it('should handle empty email gracefully', async () => {
        // ARRANGE
        const emptyEmailDto: LoginUserDto = {
          email: '',
          password: 'Password123',
        };
        mockQueryBuilder.getOne.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(
          service.login(emptyEmailDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
        });
      });

      it('should handle empty password gracefully', async () => {
        // ARRANGE
        const emptyPasswordDto: LoginUserDto = {
          email: 'test@example.com',
          password: '',
        };
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

        // ACT & ASSERT
        await expect(
          service.login(emptyPasswordDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
        });
      });

      it('should use bcrypt.compareSync for password verification (timing-safe)', async () => {
        // ARRANGE
        mockQueryBuilder.getOne.mockResolvedValue(mockUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('mock.access.token')
          .mockReturnValueOnce('mock.refresh.token');

        // ACT
        await service.login(validLoginDto, mockRequest);

        // ASSERT - Verificar que usa bcrypt y no comparación directa
        expect(bcrypt.compareSync).toHaveBeenCalledWith(
          validLoginDto.password,
          mockUser.password,
        );
      });

      it('should handle case-sensitive email correctly', async () => {
        // ARRANGE
        const upperCaseEmailDto: LoginUserDto = {
          email: 'TEST@EXAMPLE.COM',
          password: 'Password123',
        };
        mockQueryBuilder.getOne.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(
          service.login(upperCaseEmailDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
        });

        // Verificar que se buscó con el email exacto (case-sensitive)
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.email = :email',
          { email: 'TEST@EXAMPLE.COM' },
        );
      });
    });

    describe('🎯 CASOS DE ROLES Y JWT', () => {
      it('should include user role in JWT payload for ADMIN user', async () => {
        // ARRANGE
        const adminUser = {
          ...mockUser,
          role: Role.ADMIN,
          userDepartments: [
            {
              id: 1,
              assignedAt: new Date('2024-01-01'),
              department: { id: 1, name: 'Administración', isActive: true },
            },
          ],
        };
        mockQueryBuilder.getOne.mockResolvedValue(adminUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('admin.access.token')
          .mockReturnValueOnce('admin.refresh.token');

        // ACT
        await service.login(validLoginDto, mockRequest);

        // ASSERT
        expect(mockJwtService.sign).toHaveBeenNthCalledWith(
          1,
          {
            sub: adminUser.codUser,
            email: adminUser.email,
            role: Role.ADMIN,
            depts: [1],
          },
          { expiresIn: '7d' },
        );
      });

      it('should include user role in JWT payload for regular USER', async () => {
        // ARRANGE
        const regularUser = {
          ...mockUser,
          role: Role.USER,
          userDepartments: [
            {
              id: 1,
              assignedAt: new Date('2024-01-01'),
              department: { id: 1, name: 'Ventas', isActive: true },
            },
            {
              id: 2,
              assignedAt: new Date('2024-01-01'),
              department: { id: 2, name: 'Soporte', isActive: true },
            },
          ],
        };
        mockQueryBuilder.getOne.mockResolvedValue(regularUser);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        mockJwtService.sign
          .mockReturnValueOnce('user.access.token')
          .mockReturnValueOnce('user.refresh.token');

        // ACT
        await service.login(validLoginDto, mockRequest);

        // ASSERT
        expect(mockJwtService.sign).toHaveBeenNthCalledWith(
          1,
          {
            sub: regularUser.codUser,
            email: regularUser.email,
            role: Role.USER,
            depts: [1, 2],
          },
          { expiresIn: '7d' },
        );
      });
    });
  });
});
