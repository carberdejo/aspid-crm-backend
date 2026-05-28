import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para orden de compra no encontrada
 */
export class PurchaseOrderNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      110,
      `Orden de compra con ID ${id} no encontrada`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: cotización no aprobada
 */
export class QuoteNotApprovedException extends ApiException {
  constructor(quoteId: number) {
    super(
      111,
      `La cotización con ID ${quoteId} no está en estado APROBADO`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: número de OC duplicado
 */
export class PoNumberAlreadyExistsException extends ApiException {
  constructor(poNumber: string) {
    super(
      112,
      `Ya existe una orden de compra con el número: '${poNumber}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class OrderDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      113,
      `Datos de orden de compra inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: error interno al crear OC
 */
export class OrderCreationFailedException extends ApiException {
  constructor(reason: string) {
    super(
      114,
      `Error al crear la orden de compra: ${reason}`,
      undefined,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
