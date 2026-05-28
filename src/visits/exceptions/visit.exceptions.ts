import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para visita no encontrada
 * Específica de este módulo
 */
export class VisitNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      30,
      `Visita con ID ${id} no encontrada`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: relación inválida entre contacto y cliente
 * Específica de este módulo
 */
export class VisitContactNotBelongToClientException extends ApiException {
  constructor(contactId: number, clientId: number) {
    super(
      31,
      `El contacto con ID ${contactId} no pertenece al cliente con ID ${clientId}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class VisitDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      32,
      `Datos de visita inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
