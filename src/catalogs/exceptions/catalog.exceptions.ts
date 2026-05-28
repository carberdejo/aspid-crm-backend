import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception para código de segmento duplicado
 */
export class SegmentCodeAlreadyExistsException extends ApiException {
  constructor(code: string) {
    super(
      80,
      `Ya existe un segmento industrial con el código: '${code}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception para segmento no encontrado
 */
export class SegmentNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      81,
      `Segmento industrial con ID ${id} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: segmento ya desactivado
 */
export class SegmentAlreadyDeactivatedException extends ApiException {
  constructor(id: number) {
    super(
      82,
      `El segmento industrial con ID ${id} ya está desactivado`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: segmento ya activo
 */
export class SegmentAlreadyActivatedException extends ApiException {
  constructor(id: number) {
    super(
      83,
      `El segmento industrial con ID ${id} ya está activo`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: datos inválidos
 * Validaciones de formato las maneja class-validator
 */
export class SegmentDataInvalidException extends ApiException {
  constructor(details: string) {
    super(
      84,
      `Datos del segmento inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
