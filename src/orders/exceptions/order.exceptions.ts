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

/**
 * Exception de lógica de negocio: la OC está anulada y ya no se puede modificar
 */
export class OrderAnnulledException extends ApiException {
  constructor(poNumber: string) {
    super(
      115,
      `La orden de compra '${poNumber}' está anulada y no se puede modificar`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception de lógica de negocio: la acción requiere que la OC no tenga facturas vigentes
 * (anularla o cambiar su moneda). Primero se deben anular sus facturas
 */
export class OrderHasActiveInvoicesException extends ApiException {
  constructor(poNumber: string, action: string) {
    super(
      116,
      `No se puede ${action} la orden de compra '${poNumber}' porque tiene facturas vigentes. Anule primero sus facturas`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception de lógica de negocio: el nuevo monto de la OC es menor a lo ya facturado
 */
export class OrderAmountBelowInvoicedException extends ApiException {
  constructor(amount: number, invoiced: number) {
    super(
      117,
      `El monto de la orden (${amount}) no puede ser menor a lo ya facturado (${invoiced})`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: la cotización ya tiene una OC vigente
 */
export class QuoteHasActiveOrderException extends ApiException {
  constructor(quoteNumber: string) {
    super(
      118,
      `La cotización '${quoteNumber}' ya tiene una orden de compra vigente`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}
