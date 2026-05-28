import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

/**
 * Exception de lógica de negocio: credenciales inválidas
 */
export class InvalidCredentialsException extends ApiException {
  constructor() {
    super(
      70,
      'Email o contraseña incorrectos',
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Exception de lógica de negocio: refresh token inválido o expirado
 */
export class InvalidRefreshTokenException extends ApiException {
  constructor() {
    super(
      71,
      'Refresh token inválido o expirado',
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Exception de lógica de negocio: sesión no encontrada
 */
export class SessionNotFoundException extends ApiException {
  constructor(sessionId: string) {
    super(
      72,
      `Sesión con ID ${sessionId} no encontrada`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception de lógica de negocio: sesión expirada
 */
export class SessionExpiredException extends ApiException {
  constructor() {
    super(
      73,
      'La sesión ha expirado, por favor inicie sesión nuevamente',
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Exception de lógica de negocio: hash del token no coincide
 */
export class InvalidTokenHashException extends ApiException {
  constructor() {
    super(
      74,
      'El hash del token no coincide con el almacenado',
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Exception de lógica de negocio: usuario inactivo
 */
export class UserInactiveException extends ApiException {
  constructor(email: string) {
    super(
      75,
      `El usuario con email '${email}' está inactivo`,
      undefined,
      HttpStatus.FORBIDDEN,
    );
  }
}
