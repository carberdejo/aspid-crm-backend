import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para usuario no encontrado
 * Reutilizable en otros módulos que necesiten validar existencia de usuario
 */
export class UsersNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      20,
      `Usuario con ID ${id} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception para email duplicado
 * Reutilizable en otros módulos que necesiten validar emails únicos
 */
export class UsersEmailAlreadyExistsException extends ApiException {
  constructor(email: string) {
    super(
      21,
      `Ya existe un usuario con este email: '${email}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception para codUser duplicado
 */
export class UsersCodUserAlreadyExistsException extends ApiException {
  constructor(codUser: string) {
    super(
      22,
      `Ya existe un usuario con este codUser: '${codUser}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception genérica para contacto no encontrado
 * Reutilizable en otros módulos
 */
export class ContactNotFoundException extends ApiException {
  constructor(contactId: number) {
    super(
      23,
      `Contacto con ID ${contactId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: usuario sin departamentos
 * Validaciones de formato las maneja class-validator en DTO
 */
export class UserDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      27,
      `Datos de usuario inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
