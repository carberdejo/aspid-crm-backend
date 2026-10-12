// AuthService importa uuid y ua-parser-js (ESM), que Jest no transforma en este proyecto
jest.mock('uuid', () => ({ v4: () => 'session-id' }));
jest.mock('ua-parser-js', () => ({ UAParser: jest.fn() }));

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleGuard } from './user-role.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Role } from 'src/users/interfaces';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UsersController } from 'src/users/users.controller';
import { AnalyticsController } from 'src/analytics/analytics.controller';
import { DepartmentsController } from 'src/departments/departments.controller';
import { QuotesController } from 'src/quotes/quotes.controller';
import { User } from 'src/users/entities';

type ControllerClass = { prototype: Record<string, unknown> };

// Construye un ExecutionContext apuntando al handler real del controlador,
// de modo que el guard lea la metadata declarada con @Auth / @Public
const buildContext = (
  controller: ControllerClass,
  handler: string,
  user?: Partial<User>,
): ExecutionContext =>
  ({
    getHandler: () => controller.prototype[handler],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('UserRoleGuard', () => {
  const guard = new UserRoleGuard(new Reflector());

  const expectAllowed = (
    controller: ControllerClass,
    handler: string,
    role: string,
  ) =>
    expect(guard.canActivate(buildContext(controller, handler, { role }))).toBe(
      true,
    );

  const expectForbidden = (
    controller: ControllerClass,
    handler: string,
    role: string,
  ) =>
    expect(() =>
      guard.canActivate(buildContext(controller, handler, { role })),
    ).toThrow(ForbiddenException);

  describe('users (solo admin)', () => {
    const handlers = ['create', 'findAll', 'findOne', 'update', 'remove'];

    it('should forbid every endpoint to role user', () => {
      handlers.forEach((h) => expectForbidden(UsersController, h, Role.USER));
    });

    it('should allow every endpoint to role admin', () => {
      handlers.forEach((h) => expectAllowed(UsersController, h, Role.ADMIN));
    });
  });

  // El alcance (solo sus métricas y áreas) lo aplica AnalyticsService
  describe('analytics (admin y user)', () => {
    it('should allow role user', () => {
      expectAllowed(AnalyticsController, 'getQuotesSummary', Role.USER);
      expectAllowed(AnalyticsController, 'getVisitsSummary', Role.USER);
    });

    it('should forbid unknown roles', () => {
      expectForbidden(AnalyticsController, 'getQuotesSummary', 'superadmin');
    });

    it('should allow role admin', () => {
      expectAllowed(AnalyticsController, 'getQuotesSummary', Role.ADMIN);
      expectAllowed(AnalyticsController, 'getVisitsSummary', Role.ADMIN);
    });
  });

  describe('departments', () => {
    it('should allow read endpoints to role user', () => {
      expectAllowed(DepartmentsController, 'findAll', Role.USER);
      expectAllowed(DepartmentsController, 'findOne', Role.USER);
    });

    it('should forbid write endpoints to role user', () => {
      ['create', 'update', 'remove'].forEach((h) =>
        expectForbidden(DepartmentsController, h, Role.USER),
      );
    });
  });

  it('should allow any authenticated role when no roles are declared', () => {
    expectAllowed(QuotesController, 'create', Role.USER);
  });

  it('should compare roles exactly (superadmin is not admin)', () => {
    expectForbidden(UsersController, 'findAll', 'superadmin');
  });

  it('should throw UnauthorizedException when roles are required but there is no user', () => {
    // ARRANGE
    const context = buildContext(UsersController, 'findAll', undefined);

    // ACT & ASSERT
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(new Reflector());

  it('should let @Public() endpoints through without a token', () => {
    expect(guard.canActivate(buildContext(AuthController, 'create'))).toBe(
      true,
    );
    expect(guard.canActivate(buildContext(AuthController, 'refresh'))).toBe(
      true,
    );
  });

  it('should require a token on endpoints not marked as @Public()', () => {
    // ARRANGE: simulamos la validación de passport para no depender de la estrategia real
    const passportCheck = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(false);

    // ACT
    const result = guard.canActivate(buildContext(QuotesController, 'findAll'));

    // ASSERT
    expect(result).toBe(false);
    expect(passportCheck).toHaveBeenCalled();
    passportCheck.mockRestore();
  });
});

describe('AuthService.profile (control de acceso)', () => {
  const service = Object.create(AuthService.prototype) as AuthService;

  it('should forbid a user from reading another user profile', async () => {
    await expect(
      service.profile('C00001', { role: Role.USER, codUser: 'C00099' } as User),
    ).rejects.toThrow(ForbiddenException);
  });
});
