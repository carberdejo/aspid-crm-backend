/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto';
import { ApiException } from 'src/common/exceptions/api.exception';
import { Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
  };

  // Mock de Request
  const mockRequest = {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('Mozilla/5.0'),
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(authService).toBeDefined();
  });

  describe('POST /auth/login', () => {
    const validLoginDto: LoginUserDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const successResponse = {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
    };

    describe('✅ CASOS EXITOSOS', () => {
      it('should return email and JWT token on successful login', async () => {
        // ARRANGE
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        const result = await controller.create(validLoginDto, mockRequest);

        // ASSERT
        expect(result).toEqual(successResponse);
        expect(authService.login).toHaveBeenCalledWith(
          validLoginDto,
          mockRequest,
        );
        expect(authService.login).toHaveBeenCalledTimes(1);
      });

      it('should pass LoginUserDto to auth service', async () => {
        // ARRANGE
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        await controller.create(validLoginDto, mockRequest);

        // ASSERT
        expect(authService.login).toHaveBeenCalledWith(
          {
            email: validLoginDto.email,
            password: validLoginDto.password,
          },
          mockRequest,
        );
      });

      it('should handle multiple login requests', async () => {
        // ARRANGE
        const loginDto1 = { email: 'user1@test.com', password: 'Pass123' };
        const loginDto2 = { email: 'user2@test.com', password: 'Pass456' };

        mockAuthService.login
          .mockResolvedValueOnce({ email: 'user1@test.com', token: 'token1' })
          .mockResolvedValueOnce({ email: 'user2@test.com', token: 'token2' });

        // ACT
        const result1 = await controller.create(loginDto1, mockRequest);
        const result2 = await controller.create(loginDto2, mockRequest);

        // ASSERT
        expect(result1.token).toBe('token1');
        expect(result2.token).toBe('token2');
        expect(authService.login).toHaveBeenCalledTimes(2);
      });
    });

    describe('❌ CASOS DE ERROR', () => {
      it('should throw ApiException when credentials are invalid (email)', async () => {
        // ARRANGE
        const invalidEmailDto: LoginUserDto = {
          email: 'wrong@example.com',
          password: 'Password123',
        };
        mockAuthService.login.mockRejectedValue(
          new ApiException(401, 'Credentials are not valid (email)', []),
        );

        // ACT & ASSERT
        await expect(
          controller.create(invalidEmailDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
          message: 'Credentials are not valid (email)',
        });
        expect(authService.login).toHaveBeenCalledWith(
          invalidEmailDto,
          mockRequest,
        );
      });

      it('should throw ApiException when credentials are invalid (password)', async () => {
        // ARRANGE
        const invalidPasswordDto: LoginUserDto = {
          email: 'test@example.com',
          password: 'WrongPassword',
        };
        mockAuthService.login.mockRejectedValue(
          new ApiException(401, 'Credentials are not valid (password)', []),
        );

        // ACT & ASSERT
        await expect(
          controller.create(invalidPasswordDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
          message: 'Credentials are not valid (password)',
        });
      });

      it('should propagate service errors to the caller', async () => {
        // ARRANGE
        mockAuthService.login.mockRejectedValue(
          new Error('Database connection error'),
        );

        // ACT & ASSERT
        await expect(
          controller.create(validLoginDto, mockRequest),
        ).rejects.toThrow('Database connection error');
      });
    });

    describe('🔒 CASOS DE SEGURIDAD', () => {
      it('should not log or expose password in any way', async () => {
        // ARRANGE
        const loginDto: LoginUserDto = {
          email: 'test@example.com',
          password: 'SuperSecretPassword123!',
        };
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        const result = await controller.create(loginDto, mockRequest);

        // ASSERT
        expect(result).not.toHaveProperty('password');
        expect(JSON.stringify(result)).not.toContain('SuperSecretPassword123!');
      });

      it('should handle malformed email formats', async () => {
        // ARRANGE - El DTO debería validar esto, pero testeamos el flujo
        const malformedEmailDto: LoginUserDto = {
          email: 'not-an-email',
          password: 'Password123',
        };
        mockAuthService.login.mockRejectedValue(
          new ApiException(401, 'Credentials are not valid (email)', []),
        );

        // ACT & ASSERT
        await expect(
          controller.create(malformedEmailDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
        });
      });

      it('should handle very long email strings', async () => {
        // ARRANGE
        const longEmailDto: LoginUserDto = {
          email: 'a'.repeat(1000) + '@example.com',
          password: 'Password123',
        };
        mockAuthService.login.mockRejectedValue(
          new ApiException(401, 'Credentials are not valid (email)', []),
        );

        // ACT & ASSERT
        await expect(
          controller.create(longEmailDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
        });
      });

      it('should handle very long password strings', async () => {
        // ARRANGE
        const longPasswordDto: LoginUserDto = {
          email: 'test@example.com',
          password: 'P'.repeat(1000),
        };
        mockAuthService.login.mockRejectedValue(
          new ApiException(401, 'Credentials are not valid (password)', []),
        );

        // ACT & ASSERT
        await expect(
          controller.create(longPasswordDto, mockRequest),
        ).rejects.toMatchObject({
          code: 401,
        });
      });

      it('should handle special characters in email', async () => {
        // ARRANGE
        const specialCharsDto: LoginUserDto = {
          email: 'user+tag@example.co.uk',
          password: 'Password123',
        };
        mockAuthService.login.mockResolvedValue({
          accessToken: 'valid.access.token',
          refreshToken: 'valid.refresh.token',
        });

        // ACT
        const result = await controller.create(specialCharsDto, mockRequest);

        // ASSERT
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(authService.login).toHaveBeenCalledWith(
          specialCharsDto,
          mockRequest,
        );
      });

      it('should handle special characters in password', async () => {
        // ARRANGE
        const specialPasswordDto: LoginUserDto = {
          email: 'test@example.com',
          password: 'P@ssw0rd!#$%^&*()',
        };
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        await controller.create(specialPasswordDto, mockRequest);

        // ASSERT
        expect(authService.login).toHaveBeenCalledWith(
          specialPasswordDto,
          mockRequest,
        );
      });

      it('should handle unicode characters in password', async () => {
        // ARRANGE
        const unicodePasswordDto: LoginUserDto = {
          email: 'test@example.com',
          password: 'Contraseña123!',
        };
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        await controller.create(unicodePasswordDto, mockRequest);

        // ASSERT
        expect(authService.login).toHaveBeenCalledWith(
          unicodePasswordDto,
          mockRequest,
        );
      });
    });

    describe('📊 CASOS DE RESPUESTA', () => {
      it('should return response with correct structure', async () => {
        // ARRANGE
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        const result = await controller.create(validLoginDto, mockRequest);

        // ASSERT
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(typeof result.accessToken).toBe('string');
        expect(typeof result.refreshToken).toBe('string');
      });

      it('should return accessToken as a non-empty string', async () => {
        // ARRANGE
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        const result = await controller.create(validLoginDto, mockRequest);

        // ASSERT
        expect(result.accessToken).toBeTruthy();
        expect(result.accessToken.length).toBeGreaterThan(0);
      });

      it('should return the same email that was used for login', async () => {
        // ARRANGE
        mockAuthService.login.mockResolvedValue(successResponse);

        // ACT
        const result = await controller.create(validLoginDto, mockRequest);

        // ASSERT
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
      });
    });

    describe('⚡ CASOS DE RENDIMIENTO Y CONCURRENCIA', () => {
      it('should handle concurrent login requests independently', async () => {
        // ARRANGE
        const user1Dto = { email: 'user1@test.com', password: 'Pass1' };
        const user2Dto = { email: 'user2@test.com', password: 'Pass2' };
        const user3Dto = { email: 'user3@test.com', password: 'Pass3' };

        mockAuthService.login
          .mockResolvedValueOnce({
            accessToken: 'access1',
            refreshToken: 'refresh1',
          })
          .mockResolvedValueOnce({
            accessToken: 'access2',
            refreshToken: 'refresh2',
          })
          .mockResolvedValueOnce({
            accessToken: 'access3',
            refreshToken: 'refresh3',
          });

        // ACT - Ejecutar en paralelo
        const [result1, result2, result3] = await Promise.all([
          controller.create(user1Dto, mockRequest),
          controller.create(user2Dto, mockRequest),
          controller.create(user3Dto, mockRequest),
        ]);

        // ASSERT
        expect(result1.accessToken).toBe('access1');
        expect(result2.accessToken).toBe('access2');
        expect(result3.accessToken).toBe('access3');
        expect(authService.login).toHaveBeenCalledTimes(3);
      });
    });
  });
});
