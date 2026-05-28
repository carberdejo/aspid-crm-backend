import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception específica para cuando una entrega no se encuentra
 * Reutiliza el patrón de NOT FOUND (404)
 */
export class DeliveryNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      90,
      `Entrega con ID ${id} no encontrada`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: entrega sin items
 * Las validaciones de formato/estructura las maneja class-validator en DTO
 */
export class EmptyDeliveryItemsException extends ApiException {
  constructor() {
    super(
      91,
      'La entrega debe contener al menos un item',
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception de lógica de negocio: datos específicos de entrega inválidos
 * que no pueden validarse en DTO (ej: reglas complejas)
 */
export class InvalidDeliveryDataException extends ApiException {
  constructor(details: string) {
    super(
      92,
      `Datos de entrega inválidos: ${details}`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
