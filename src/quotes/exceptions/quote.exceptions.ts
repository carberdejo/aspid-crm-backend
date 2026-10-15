import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para cotización no encontrada
 * Reutilizable en órdenes e invoices
 */
export class QuoteNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      50,
      `Cotización con ID ${id} no encontrada`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception para número de cotización duplicado
 */
export class QuoteNumberAlreadyExistsException extends ApiException {
  constructor(quoteNumber: string) {
    super(
      51,
      `Ya existe una cotización con el número: '${quoteNumber}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception de lógica de negocio: relación inválida entre contacto y cliente
 */
export class QuoteContactNotBelongToClientException extends ApiException {
  constructor(contactId: number, clientId: number) {
    super(
      52,
      `El contacto con ID ${contactId} no pertenece al cliente con ID ${clientId}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: transición de estado inválida
 * Específica de este módulo
 */
export class QuoteInvalidStatusTransitionException extends ApiException {
  constructor(currentStatus: string, newStatus: string) {
    super(
      53,
      `No se puede cambiar de estado '${currentStatus}' a '${newStatus}'`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class QuoteDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      54,
      `Datos de cotización inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: solo las cotizaciones PENDIENTE se pueden editar.
 * Una aprobada ya tiene orden de compra y una rechazada está cerrada.
 */
export class QuoteNotEditableException extends ApiException {
  constructor(status: string) {
    super(
      55,
      `Solo se pueden editar cotizaciones en estado PENDIENTE (estado actual: ${status})`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}
