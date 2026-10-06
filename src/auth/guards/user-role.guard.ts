import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_ROLES } from 'src/auth/decorators/role-protected.decorator';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Los roles del método tienen prioridad sobre los declarados en el controlador
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(META_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos (o el arreglo está vacío), deja pasar
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<Express.Request>();
    const user = req.user as User | undefined;

    if (!user) throw new UnauthorizedException('User not found in request');

    // Comparación exacta: evita que 'superadmin' coincida con 'admin'
    if (requiredRoles.includes(user.role as Role)) return true;

    throw new ForbiddenException(
      'user does not have the required roles: ' + requiredRoles.join(', '),
    );
  }
}
