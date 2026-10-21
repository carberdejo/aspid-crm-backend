/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError } from 'typeorm';
import { AppLoggerService } from '../logging/logger.service';
import { ApiErrorResponse } from '../interfaces/response.interface';
import { ApiException } from '../exceptions/api.exception';

interface NestHttpExceptionResponse {
  message: string | string[];
  error: string;
  statusCode: number;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Determinar el Status Code y construir la respuesta
    const { httpStatus, errorResponse } = this.buildErrorDetails(exception);

    // 2. Loguear el error con todo el contexto (Lo que pediste)
    this.logDetailedError(exception, request, httpStatus);

    // 3. Enviar la respuesta formateada al cliente
    response.status(httpStatus).json(errorResponse);
  }

  private buildErrorDetails(exception: unknown): {
    httpStatus: number;
    errorResponse: ApiErrorResponse;
  } {
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    // Código de negocio (ver EXCEPTIONS_GUIDE.md). Si la excepción no trae uno,
    // se usa el status HTTP como código.
    let code: number | undefined;
    let message = 'Internal server error';
    let errors: any[] | null = null;

    // CASO A: Error de base de datos (Llave duplicada)
    if (
      exception instanceof QueryFailedError &&
      (exception as any).code === '23505'
    ) {
      httpStatus = HttpStatus.BAD_REQUEST;
      message = 'Registro duplicado';
      errors = [(exception as any).detail]; // Detalle de Postgres: "Key (quote_number)=(...) already exists"
    }

    // CASO B: Tu ApiException personalizada
    else if (exception instanceof ApiException) {
      const res = exception.getResponse() as any;
      httpStatus = exception.getStatus();
      code = exception.code;
      message = res.message || exception.message;
      errors = res.errors;
    }

    // CASO C: Excepciones estándar de NestJS (ej. NotFound, Unauthorized)
    else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && 'message' in res) {
        const responseObj = res as NestHttpExceptionResponse;
        message = Array.isArray(responseObj.message)
          ? 'Validation failed'
          : responseObj.message;
        errors = Array.isArray(responseObj.message)
          ? responseObj.message
          : null;
      } else {
        message = typeof res === 'string' ? res : (exception as any).message;
      }
    }

    return {
      httpStatus,
      errorResponse: {
        code: code ?? httpStatus,
        message,
        errors: this.formatErrors(errors),
      },
    };
  }

  private logDetailedError(
    exception: unknown,
    request: Request,
    status: number,
  ) {
    const { method, url, body } = request;
    const basicInfo = `${method} ${url} - Status: ${status}`;

    if (exception instanceof QueryFailedError) {
      this.logger.error(
        `${basicInfo} | DB_ERROR: ${exception.message} | QUERY: ${exception.query}`,
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        `${basicInfo} | MSG: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`${basicInfo} | DATA: ${JSON.stringify(body)}`);
    }
  }

  private formatErrors(errors: any[] | null): string[] | null {
    if (!errors || !Array.isArray(errors) || errors.length === 0) return null;
    return errors.map((err) =>
      typeof err === 'object' ? JSON.stringify(err) : String(err),
    );
  }
}
