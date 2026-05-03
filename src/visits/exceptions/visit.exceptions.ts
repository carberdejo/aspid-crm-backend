import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

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

export class VisitUserNotFoundException extends ApiException {
  constructor(userId: number) {
    super(
      32,
      `Usuario con ID ${userId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class VisitClientNotFoundException extends ApiException {
  constructor(clientId: number) {
    super(
      33,
      `Cliente con ID ${clientId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class VisitContactNotFoundException extends ApiException {
  constructor(contactId: number) {
    super(
      34,
      `Contacto con ID ${contactId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class VisitDepartmentNotFoundException extends ApiException {
  constructor(departmentId: number) {
    super(
      35,
      `Departamento con ID ${departmentId} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}
