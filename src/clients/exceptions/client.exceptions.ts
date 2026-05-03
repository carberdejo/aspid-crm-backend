import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

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

export class ContactClientNotFoundException extends ApiException {
  constructor(contactId: number) {
    super(
      12,
      `Contacto con ID ${contactId} no encontrado.`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}