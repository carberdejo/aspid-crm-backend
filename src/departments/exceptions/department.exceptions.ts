import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

export class DepartmentNotFoundException extends ApiException {
  constructor(id: number) {
    super(
      40,
      `Departamento con ID ${id} no encontrado`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DepartmentAlreadyExistsException extends ApiException {
  constructor(name: string) {
    super(
      41,
      `Ya existe un departamento con el nombre: '${name}'`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }
}
