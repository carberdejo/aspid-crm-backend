import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

export class UsersNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      20,
      `User con ID ${id} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UsersEmailAlreadyExistsException extends ApiException {
  constructor(email: string) {
    super(
      21,
      `Ya existe un usuario con este email: '${email}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

export class UsersCodUserAlreadyExistsException extends ApiException {
  constructor(codUser: string) {
    super(
      22,
      `Ya existe un usuario con este codUser: '${codUser}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}

export class ContactUsersNotFoundException extends ApiException {
  constructor(contactId: number) {
    super(
      23,
      `Contacto con ID ${contactId} no encontrado.`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}
