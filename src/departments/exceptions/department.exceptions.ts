import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para departamento no encontrado
 * Reutilizable en otros módulos (users, quotes, visits, etc)
 */
export class DepartmentNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      40,
      `Departamento con ID ${id} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception para nombre de departamento duplicado
 */
export class DepartmentAlreadyExistsException extends ApiException {
  constructor(name: string) {
    super(
      41,
      `Ya existe un departamento con el nombre: '${name}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception de lógica de negocio: departamento en uso
 */
export class DepartmentInUseException extends ApiException {
  constructor(id: number) {
    super(
      42,
      `No se puede eliminar el departamento con ID ${id} porque está en uso`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class DepartmentDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      43,
      `Datos de departamento inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
