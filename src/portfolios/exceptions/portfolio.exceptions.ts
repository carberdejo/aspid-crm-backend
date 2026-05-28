import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para código de cartera duplicado
 */
export class PortfolioCodeAlreadyExistsException extends ApiException {
  constructor(code: string) {
    super(
      120,
      `Ya existe una cartera con el código: '${code}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception para cartera no encontrada
 */
export class PortfolioNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      121,
      `Cartera con ID ${id} no encontrada`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: cartera ya desactivada
 */
export class PortfolioAlreadyDeactivatedException extends ApiException {
  constructor(id: number) {
    super(
      122,
      `La cartera con ID ${id} ya está desactivada`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: cartera ya activa
 */
export class PortfolioAlreadyActivatedException extends ApiException {
  constructor(id: number) {
    super(
      123,
      `La cartera con ID ${id} ya está activa`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: cartera sin usuarios
 */
export class EmptyPortfolioUsersException extends ApiException {
  constructor() {
    super(
      124,
      'La cartera debe contener al menos un usuario asignado',
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class PortfolioDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      125,
      `Datos de cartera inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: error interno al actualizar
 */
export class PortfolioUpdateFailedException extends ApiException {
  constructor(reason: string) {
    super(
      126,
      `Error al actualizar la cartera: ${reason}`,
      undefined,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
