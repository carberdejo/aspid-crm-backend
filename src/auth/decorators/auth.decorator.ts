import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RoleProtected } from './role-protected.decorator';
import { Role } from 'src/users/interfaces';

// JwtAuthGuard y UserRoleGuard están registrados como APP_GUARD (ver AuthModule),
// por lo que este decorador solo declara los roles requeridos y la documentación Swagger.
export function Auth(...roles: Role[]) {
  return applyDecorators(
    RoleProtected(...roles),
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({
      description: 'No autorizado - Token inválido o expirado',
    }),
  );
}
