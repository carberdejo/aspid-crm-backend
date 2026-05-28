import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para cliente no encontrado
 * Reutilizable en otros módulos (visits, quotes, orders, etc)
 */
export class ClientNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      10,
      `Cliente con ID ${id} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception para RUC duplicado
 * Reutilizable en otros módulos que validen RUC único
 */
export class ClientRucAlreadyExistsException extends ApiException {
  constructor(ruc: string) {
    super(
      11,
      `Ya existe un cliente con este RUC: '${ruc}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception genérica para contacto no encontrado
 * (Reutilizar desde users.exceptions.ContactNotFoundException)
 */
export class ContactNotFoundException extends ApiException {
  constructor(contactId: number) {
    super(
      12,
      `Contacto con ID ${contactId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: error al consultar SUNAT API
 * Específico de este módulo
 */
export class SunatApiException extends ApiException {
  constructor(ruc: string, reason: string) {
    super(
      13,
      `Error al consultar SUNAT para RUC '${ruc}': ${reason}`,
      undefined,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Exception de lógica de negocio: RUC no encontrado en SUNAT
 * Específico de este módulo
 */
export class SunatRucNotFoundAdvException extends ApiException {
  constructor(ruc: string) {
    super(
      14,
      `RUC '${ruc}' no encontrado en SUNAT`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class ClientDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      15,
      `Datos del cliente inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
