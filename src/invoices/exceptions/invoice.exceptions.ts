import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para factura no encontrada
 */
export class InvoiceNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      100,
      `Factura con ID ${id} no encontrada`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception para número de factura duplicado
 */
export class InvoiceNumberAlreadyExistsException extends ApiException {
  constructor(invoiceNumber: string) {
    super(
      101,
      `Ya existe una factura con el número: '${invoiceNumber}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception de lógica de negocio: monto de factura excede disponible en OC
 */
export class InvoiceAmountExceedsOrderException extends ApiException {
  constructor(invoiceAmount: number, availableAmount: number) {
    super(
      102,
      `El monto de la factura (${invoiceAmount}) excede el monto disponible de la orden (${availableAmount})`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class InvoiceDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      103,
      `Datos de factura inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: error interno al crear factura
 */
export class InvoiceCreationFailedException extends ApiException {
  constructor(reason: string) {
    super(
      104,
      `Error al crear la factura: ${reason}`,
      undefined,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
