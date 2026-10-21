import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception de lógica de negocio: rango de fechas inválido
 * La validación de formato ISO 8601 la maneja class-validator
 */
export class InvalidDateRangeException extends ApiException {
  constructor(startDate: string, endDate: string) {
    super(
      60,
      `Rango de fechas inválido: la fecha de inicio '${startDate}' es posterior a la fecha de fin '${endDate}'`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: sin datos disponibles para las métricas
 */
export class NoDataAvailableForMetricsException extends ApiException {
  constructor() {
    super(
      61,
      'No hay datos disponibles para el rango de fechas solicitado',
      undefined,
      HttpStatus.OK,
    );
  }
}

/**
 * Exception de lógica de negocio: parámetros de métricas inválidos
 * Validaciones básicas las maneja class-validator
 */
export class InvalidMetricsParametersException extends ApiException {
  constructor(details: string) {
    super(
      62,
      `Parámetros de métricas inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
