import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

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

export class QuoteUserNotFoundException extends ApiException {
  constructor(userId: number) {
    super(
      53,
      `Usuario con ID ${userId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class QuoteClientNotFoundException extends ApiException {
  constructor(clientId: number) {
    super(
      54,
      `Cliente con ID ${clientId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class QuoteContactNotFoundException extends ApiException {
  constructor(contactId: number) {
    super(
      55,
      `Contacto con ID ${contactId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class QuoteDepartmentNotFoundException extends ApiException {
  constructor(departmentId: number) {
    super(
      56,
      `Departamento con ID ${departmentId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class QuoteInvalidStatusTransitionException extends ApiException {
  constructor(currentStatus: string, newStatus: string) {
    super(
      57,
      `No se puede cambiar de estado '${currentStatus}' a '${newStatus}'`,
      undefined,
      HttpStatus.BAD_REQUEST,
    );
  }
}
