import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../exceptions/api.exception';

/**
 * El usuario intenta operar en un área a la que no pertenece
 */
export class DepartmentAccessDeniedException extends ApiException {
  constructor(departmentId: number) {
    super(
      130,
      `No perteneces al área con ID ${departmentId}`,
      undefined,
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * El usuario intenta ver o modificar un registro que no le pertenece
 */
export class ResourceOwnershipException extends ApiException {
  constructor(resource: string, id: number) {
    super(
      131,
      `No tienes permisos sobre ${resource} con ID ${id}`,
      undefined,
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * El admin intenta registrar una actividad a nombre de un usuario
 * que no existe, está inactivo o no pertenece al área indicada
 */
export class TargetUserNotInDepartmentException extends ApiException {
  constructor(userId: number, departmentId: number) {
    super(
      132,
      `El usuario con ID ${userId} no está activo o no pertenece al área con ID ${departmentId}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
